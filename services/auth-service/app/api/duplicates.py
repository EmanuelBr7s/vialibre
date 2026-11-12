"""Traduccion determinista de violaciones de restriccion unica a HTTP 409 (B3-B.1).

La unicidad del correo de registro la garantiza el indice unico
`ix_vialibre_auth_users_email` de la base de datos. Cuando dos registros
concurrentes usan el mismo correo, el segundo recibe un IntegrityError que,
sin traduccion, se convertiria en un HTTP 500.

La clasificacion es por nombre EXACTO de restriccion (y por la marca
"unique constraint" del mensaje del motor): cualquier otra violacion de
integridad NO se clasifica como duplicado, se registra y se propaga el
IntegrityError original (el cliente recibe el 500 generico de FastAPI, sin
SQL ni datos en la respuesta).
"""

import logging

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)

_UNIQUE_MARKER = "duplicate key value violates unique constraint"


def raise_duplicate_conflict(
    exc: IntegrityError, *, constraint: str, detail: str
) -> None:
    """Lanza HTTP 409 con el `detail` del chequeo secuencial del endpoint si
    `exc` es la violacion de la restriccion unica `constraint`.

    Si es otra violacion de integridad, registra el incidente y devuelve sin
    lanzar: el endpoint debe re-lanzar `exc` para no convertir falsamente un
    error desconocido en un duplicado.
    """
    origen = getattr(exc, "orig", None)
    mensaje = str(origen) if origen is not None else str(exc)
    if _UNIQUE_MARKER in mensaje and constraint in mensaje:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=detail
        ) from None
    logger.error(
        "Violacion de integridad no reconocida (restriccion esperada: %s); "
        "se propaga el IntegrityError original.",
        constraint,
        exc_info=exc,
    )
