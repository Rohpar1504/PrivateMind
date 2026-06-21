from uuid import UUID

from fastapi import APIRouter

from app.models.schemas import ReviewCompleteRequest, SM2Record

router = APIRouter(prefix="/review", tags=["review"])


@router.get("/due", response_model=list[SM2Record])
async def get_due():
    # TODO (M3): query SQLite for SM2 records where next_review_date <= today
    return []


@router.get("/completed", response_model=list[SM2Record])
async def get_completed():
    # TODO (M3): query SQLite for records reviewed today
    return []


@router.post("/{sm2_id}/complete", status_code=204)
async def complete_review(sm2_id: UUID, body: ReviewCompleteRequest):
    # TODO (M3): apply SM-2 update (ease_factor, interval, next_review_date)
    raise NotImplementedError
