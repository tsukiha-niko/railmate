"""
12306 认证服务
支持扫码登录，持久化 Cookie，供票价等需要鉴权的接口使用。
"""
from __future__ import annotations

import json
import threading
import time
from pathlib import Path
from typing import Dict, Optional

import httpx

from app.core.logger import logger

# ── 本地持久化路径 ──────────────────────────────────────────────────────────────
COOKIES_PATH = Path("./12306_session.json")
# Cookie 有效期（秒），30 天
COOKIE_TTL = 30 * 24 * 3600


class Railway12306Auth:
    """
    12306 账户登录与 Cookie 管理。
    使用单例，所有地方通过 get_auth_instance() 访问。
    """

    PASSPORT = "https://kyfw.12306.cn/passport"
    OTN = "https://kyfw.12306.cn/otn"

    HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": "https://kyfw.12306.cn",
        "Referer": "https://kyfw.12306.cn/otn/passport?redirect=/otn/login/userLogin",
    }

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._cookies: Dict[str, str] = {}
        self._logged_in = False
        self._username: Optional[str] = None
        self._expires_at: float = 0.0
        # 每次扫码登录用一个新 client（保留 cookie jar）
        self._client = httpx.Client(
            follow_redirects=True,
            headers=self.HEADERS,
            timeout=20.0,
        )
        self._load_cached()

    # ── 持久化 ──────────────────────────────────────────────────────────────────

    def _load_cached(self) -> None:
        """启动时尝试从文件恢复 Cookie。"""
        if not COOKIES_PATH.exists():
            return
        try:
            data = json.loads(COOKIES_PATH.read_text(encoding="utf-8"))
            if data.get("expires_at", 0) > time.time():
                self._cookies = data["cookies"]
                self._username = data.get("username", "")
                self._expires_at = data["expires_at"]
                self._logged_in = True
                # 把缓存的 cookie 注入到 client
                self._inject_cookies_to_client(self._cookies)
                logger.info(f"✅ 已从缓存恢复 12306 登录: {self._username}")
            else:
                logger.info("12306 缓存 Cookie 已过期，需重新登录")
        except Exception as exc:
            logger.warning(f"加载 12306 Cookie 缓存失败: {exc}")

    def _save_cached(self) -> None:
        """将当前 Cookie 写入本地文件。"""
        data = {
            "cookies": self._cookies,
            "username": self._username or "",
            "expires_at": self._expires_at,
            "saved_at": time.time(),
        }
        try:
            COOKIES_PATH.write_text(
                json.dumps(data, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        except Exception as exc:
            logger.warning(f"保存 12306 Cookie 缓存失败: {exc}")

    def _inject_cookies_to_client(self, cookies: Dict[str, str]) -> None:
        """将 cookie dict 注入到 httpx Client 的 cookie jar。"""
        for k, v in cookies.items():
            self._client.cookies.set(k, v, domain=".12306.cn")

    # ── 对外接口 ─────────────────────────────────────────────────────────────────

    @property
    def is_logged_in(self) -> bool:
        return self._logged_in and bool(self._cookies) and self._expires_at > time.time()

    @property
    def username(self) -> Optional[str]:
        return self._username

    @property
    def expires_at(self) -> float:
        return self._expires_at

    def get_auth_cookies(self) -> Dict[str, str]:
        """
        返回当前有效的认证 Cookie 字典。
        Railway12306API 用此注入到自己的 httpx headers。
        """
        if self.is_logged_in:
            return dict(self._cookies)
        return {}

    # ── 二维码登录 ────────────────────────────────────────────────────────────────

    def create_qrcode(self) -> Dict:
        """
        向 12306 申请登录二维码。
        返回 {"success": True, "uuid": "...", "image": "<base64 PNG>"}
        """
        try:
            try:
                self._client.get(f"{self.OTN}/resources/login.html")
            except Exception:
                pass
            resp = self._client.get(
                f"{self.PASSPORT}/web/create-qr64",
                params={"appid": "otn"},
            )
            data = resp.json()
            if str(data.get("result_code")) == "0":
                return {
                    "success": True,
                    "uuid": data["uuid"],
                    "image": data["image"],  # base64 PNG，直接给前端渲染
                }
            return {"success": False, "message": data.get("result_message", "申请二维码失败")}
        except Exception as exc:
            logger.warning(f"create_qrcode 失败: {exc}")
            return {"success": False, "message": str(exc)}

    def poll_qrcode(self, uuid: str) -> Dict:
        """
        轮询二维码扫描状态。
        result_code: "0"=等待扫码, "1"=已扫描(待确认), "2"=已确认登录, "3"=已过期
        返回 {"status": "waiting"|"scanned"|"confirmed"|"expired", "username": "..."}
        """
        STATUS_MAP = {"0": "waiting", "1": "scanned", "2": "confirmed", "3": "expired"}
        try:
            resp = self._client.post(
                f"{self.PASSPORT}/web/checkqr",
                data={"uuid": uuid, "appid": "otn"},
            )
            data = resp.json()
            code = str(data.get("result_code", "0"))
            status = STATUS_MAP.get(code, "waiting")

            if status == "confirmed":
                # apptk → uamtk → 确认登录，收集所有 Cookie
                uamtk = self._fetch_uamtk()
                if uamtk:
                    username = self._confirm_login(uamtk)
                    # 从 client 的 cookie jar 收集所有 cookie
                    all_cookies = {c.name: c.value for c in self._client.cookies.jar}
                    with self._lock:
                        self._cookies = all_cookies
                        self._username = username or data.get("username", "")
                        self._expires_at = time.time() + COOKIE_TTL
                        self._logged_in = True
                    self._save_cached()
                    # 通知 Railway12306API 重置 session（让它下次重新注入 cookie）
                    _notify_api_reset()
                    logger.info(f"✅ 12306 扫码登录成功: {self._username}")
                    return {"status": "confirmed", "username": self._username}

            return {"status": status}
        except Exception as exc:
            logger.warning(f"poll_qrcode 失败: {exc}")
            return {"status": "error", "message": str(exc)}

    def _fetch_uamtk(self) -> Optional[str]:
        """Step 1: 获取 uamtk token。"""
        try:
            resp = self._client.post(
                f"{self.PASSPORT}/web/auth/uamtk",
                data={"appid": "otn"},
            )
            return resp.json().get("newapptk")
        except Exception as exc:
            logger.warning(f"_fetch_uamtk 失败: {exc}")
            return None

    def _confirm_login(self, uamtk: str) -> Optional[str]:
        """Step 2: 用 uamtk 向 otn 完成最终确认，返回用户名。"""
        try:
            resp = self._client.post(
                f"{self.OTN}/uamauthclient",
                data={"tk": uamtk},
            )
            data = resp.json()
            return data.get("username") or data.get("apptk")
        except Exception as exc:
            logger.warning(f"_confirm_login 失败: {exc}")
            return None

    # ── 退出登录 ─────────────────────────────────────────────────────────────────

    def invalidate(self) -> None:
        """
        标记当前 Cookie 已失效（会话过期但未手动退出时调用）。
        不发网络请求，只清除本地缓存，并通知 railway_api 重置 session。
        """
        username = self._username
        with self._lock:
            self._cookies = {}
            self._logged_in = False
            self._expires_at = 0.0
            self._client.cookies.clear()
        if COOKIES_PATH.exists():
            COOKIES_PATH.unlink(missing_ok=True)
        _notify_api_reset()
        logger.warning(f"⚠️ 12306 账户「{username}」的 Cookie 已自动失效，需重新扫码登录")

    def logout(self) -> None:
        """清除登录状态并退出。"""
        try:
            self._client.get(f"{self.OTN}/login/loginOut")
        except Exception:
            pass
        with self._lock:
            self._cookies = {}
            self._logged_in = False
            self._username = None
            self._expires_at = 0.0
            self._client.cookies.clear()
        if COOKIES_PATH.exists():
            COOKIES_PATH.unlink(missing_ok=True)
        _notify_api_reset()
        logger.info("12306 已退出登录")

    # ── 状态摘要 ─────────────────────────────────────────────────────────────────

    def status_dict(self) -> Dict:
        remaining_days = max(0, int((self._expires_at - time.time()) / 86400)) if self._expires_at else 0
        return {
            "logged_in": self.is_logged_in,
            "username": self._username or "",
            "expires_at": int(self._expires_at),
            "remaining_days": remaining_days,
        }


# ── 单例 ─────────────────────────────────────────────────────────────────────────

_auth_instance: Optional[Railway12306Auth] = None
_auth_lock = threading.Lock()


def get_auth_instance() -> Railway12306Auth:
    global _auth_instance
    if _auth_instance is None:
        with _auth_lock:
            if _auth_instance is None:
                _auth_instance = Railway12306Auth()
    return _auth_instance


def _notify_api_reset() -> None:
    """通知 Railway12306API 单例在下次请求时重新注入 Cookie。"""
    try:
        from app.services.railway_api import get_railway_api
        api = get_railway_api()
        api.reset_session()
    except Exception:
        pass
