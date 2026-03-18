"""
12306 设备 Cookie 获取（无登录）

使用 subprocess 运行 Playwright，完全规避 asyncio 事件循环冲突。
后台守护线程每 6 小时自动刷新，调用方从缓存读取（永不阻塞）。
"""
from __future__ import annotations

import json
import subprocess
import sys
import threading
import time
from typing import Dict, Optional, Tuple

from app.core.logger import logger

_lock = threading.Lock()
_cached: Optional[Tuple[float, Dict[str, str]]] = None   # (expires_at, cookies)
_refresh_thread: Optional[threading.Thread] = None
_CACHE_TTL = 6 * 3600   # 6 小时


def _now() -> float:
    return time.time()


# Playwright 脚本：在独立子进程中执行，完全不受父进程 asyncio 影响
_PW_SCRIPT = """
import json, sys
try:
    from playwright.sync_api import sync_playwright
    cookies = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        ctx = browser.new_context()
        page = ctx.new_page()
        page.goto("https://kyfw.12306.cn/otn/leftTicket/init",
                  wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(1500)
        for c in ctx.cookies():
            if c["name"] in ("RAIL_DEVICEID", "RAIL_EXPIRATION"):
                cookies[c["name"]] = c["value"]
        ctx.close()
        browser.close()
    print(json.dumps(cookies))
except Exception as e:
    sys.stderr.write(str(e) + "\\n")
    print("{}")
"""


def _fetch_via_subprocess() -> Dict[str, str]:
    """运行子进程获取 12306 设备 Cookie（最长等 60 秒）。"""
    try:
        result = subprocess.run(
            [sys.executable, "-c", _PW_SCRIPT],
            capture_output=True,
            text=True,
            timeout=65,
        )
        stdout = result.stdout.strip()
        if stdout:
            data = json.loads(stdout)
            if isinstance(data, dict):
                return data
        if result.stderr:
            logger.debug(f"Playwright 子进程 stderr: {result.stderr[:200]}")
    except subprocess.TimeoutExpired:
        logger.debug("Playwright 子进程超时（60s）")
    except Exception as e:
        logger.debug(f"Playwright 子进程异常: {e}")
    return {}


def _background_loop() -> None:
    """后台守护线程：立即执行一次，然后每 6 小时刷新。"""
    global _cached
    while True:
        try:
            cookies = _fetch_via_subprocess()
            if cookies.get("RAIL_DEVICEID") and cookies.get("RAIL_EXPIRATION"):
                with _lock:
                    _cached = (_now() + _CACHE_TTL, cookies)
                logger.info("✅ 已获取 12306 设备Cookie（后台子进程）")
            else:
                logger.debug("设备Cookie刷新：未获取到 RAIL_DEVICEID/RAIL_EXPIRATION")
        except Exception as e:
            logger.debug(f"设备Cookie后台刷新异常: {e}")
        time.sleep(_CACHE_TTL)


def _ensure_background_started() -> None:
    global _refresh_thread
    if _refresh_thread is None or not _refresh_thread.is_alive():
        _refresh_thread = threading.Thread(
            target=_background_loop,
            daemon=True,
            name="12306-device-cookie-refresher",
        )
        _refresh_thread.start()


def get_12306_device_cookies(force_refresh: bool = False) -> Dict[str, str]:
    """
    获取 12306 设备 Cookie（非阻塞）。
    - 缓存有效 → 直接返回
    - 缓存过期/空 → 启动后台刷新，本次返回空 {}（下次调用时命中缓存）
    """
    global _cached
    _ensure_background_started()
    with _lock:
        if not force_refresh and _cached and _cached[0] > _now():
            return dict(_cached[1])
    return {}


# 模块加载时立即启动后台刷新（服务器启动约 30–60 秒后 Cookie 可用）
_ensure_background_started()
