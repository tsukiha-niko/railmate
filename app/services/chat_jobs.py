"""
聊天任务调度与真实进度跟踪
"""

from __future__ import annotations

import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional

from app.core.exceptions import AIAgentError
from app.core.logger import logger
from app.schemas.chat import (
    ChatJobCreateResponse,
    ChatJobStatusResponse,
    ChatRequest,
    ChatResponse,
    ProgressEvent,
)
from app.services.ai_agent import get_agent


@dataclass
class ChatJobRecord:
    job_id: str
    conversation_id: str
    status: str = "queued"
    progress_percent: int = 0
    current_message: str = "任务已创建"
    events: List[ProgressEvent] = field(default_factory=list)
    result: Optional[ChatResponse] = None
    error: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


class ChatJobManager:
    """内存版聊天任务管理器"""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._jobs: Dict[str, ChatJobRecord] = {}

    def create_job(self, request: ChatRequest) -> ChatJobCreateResponse:
        conversation_id = request.conversation_id or str(uuid.uuid4())[:8]
        job_id = uuid.uuid4().hex[:12]
        record = ChatJobRecord(job_id=job_id, conversation_id=conversation_id)

        with self._lock:
            self._jobs[job_id] = record
            self._trim_jobs_locked()

        worker = threading.Thread(
            target=self._run_job,
            args=(job_id, request.model_copy(update={"conversation_id": conversation_id})),
            daemon=True,
            name=f"chat-job-{job_id}",
        )
        worker.start()

        return ChatJobCreateResponse(
            job_id=job_id,
            conversation_id=conversation_id,
            status="queued",
            progress_percent=0,
            current_message="任务已创建",
        )

    def get_job(self, job_id: str) -> Optional[ChatJobStatusResponse]:
        with self._lock:
            record = self._jobs.get(job_id)
            if not record:
                return None
            return self._to_status(record)

    def update_progress(
        self,
        job_id: str,
        *,
        status: str,
        percent: int,
        message: str,
        detail: Optional[str] = None,
        append_event: bool = True,
    ) -> None:
        with self._lock:
            record = self._jobs.get(job_id)
            if not record:
                return

            percent = max(0, min(100, percent))
            record.status = status
            record.progress_percent = percent
            record.current_message = message
            record.updated_at = datetime.now()
            if append_event:
                record.events.append(
                    ProgressEvent(
                        status=status if status in {"queued", "running", "completed", "failed"} else "running",
                        percent=percent,
                        message=message,
                        detail=detail,
                    )
                )
                if len(record.events) > 24:
                    record.events = record.events[-24:]

    def mark_completed(self, job_id: str, result: ChatResponse) -> None:
        with self._lock:
            record = self._jobs.get(job_id)
            if not record:
                return
            record.result = result
            record.status = "completed"
            record.progress_percent = 100
            record.current_message = "已生成回复"
            record.updated_at = datetime.now()
            record.events.append(
                ProgressEvent(
                    status="completed",
                    percent=100,
                    message="已生成回复",
                    detail="聊天任务完成",
                )
            )
            if len(record.events) > 24:
                record.events = record.events[-24:]

    def mark_failed(self, job_id: str, error: str) -> None:
        with self._lock:
            record = self._jobs.get(job_id)
            if not record:
                return
            record.status = "failed"
            record.error = error
            record.current_message = "任务失败"
            record.updated_at = datetime.now()
            record.events.append(
                ProgressEvent(
                    status="failed",
                    percent=record.progress_percent,
                    message="任务失败",
                    detail=error,
                )
            )
            if len(record.events) > 24:
                record.events = record.events[-24:]

    def _run_job(self, job_id: str, request: ChatRequest) -> None:
        try:
            self.update_progress(
                job_id,
                status="running",
                percent=3,
                message="正在读取用户上下文",
                detail="准备聊天任务",
            )

            user_id = request.user_id or "default"
            agent = get_agent(user_id)

            if request.location:
                agent.set_location(
                    city=request.location.city,
                    station=request.location.station,
                )

            if agent.client is None:
                raise AIAgentError("AI 服务未配置，请在 .env 中设置 OPENAI_API_KEY")

            response = agent.chat(
                message=request.message,
                conversation_id=request.conversation_id,
                planning_mode=request.planning_mode,
                on_progress=lambda event: self.update_progress(job_id, **event),
            )
            self.mark_completed(job_id, response)
        except Exception as exc:
            logger.error(f"聊天任务失败: {exc}")
            self.mark_failed(job_id, str(exc))

    @staticmethod
    def _to_status(record: ChatJobRecord) -> ChatJobStatusResponse:
        return ChatJobStatusResponse(
            job_id=record.job_id,
            conversation_id=record.conversation_id,
            status=record.status,  # type: ignore[arg-type]
            progress_percent=record.progress_percent,
            current_message=record.current_message,
            events=list(record.events),
            result=record.result,
            error=record.error,
        )

    def _trim_jobs_locked(self) -> None:
        if len(self._jobs) <= 100:
            return
        ordered = sorted(self._jobs.values(), key=lambda item: item.updated_at)
        for item in ordered[: len(self._jobs) - 100]:
            self._jobs.pop(item.job_id, None)


_job_manager: Optional[ChatJobManager] = None
_job_manager_lock = threading.Lock()


def get_chat_job_manager() -> ChatJobManager:
    global _job_manager
    if _job_manager is None:
        with _job_manager_lock:
            if _job_manager is None:
                _job_manager = ChatJobManager()
    return _job_manager
