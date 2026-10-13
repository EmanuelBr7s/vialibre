"""
Seed script for Vialibre auth-service.
Creates roles and demo users (empresas, estudiantes, egresados) with FIXED
UUIDs. Idempotent: existing users are updated with the demo profile data
(passwords are only set on creation).

Usage:
  docker-compose exec auth-service python -m app.seed
"""

import asyncio
import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.database import async_session
from app.models.role import Role
from app.models.user import User
from vialibre_common.pdf import A4_HEIGHT, A4_WIDTH, Pdf


# Fixed UUIDs for deterministic seeding
ROLE_ADMIN_ID = uuid.UUID("a0000000-0000-0000-0000-000000000001")
ROLE_PUBLICADOR_ID = uuid.UUID("a0000000-0000-0000-0000-000000000002")
ROLE_SOLUCIONADOR_ID = uuid.UUID("a0000000-0000-0000-0000-000000000003")
ROLE_EGRESADO_ID = uuid.UUID("a0000000-0000-0000-0000-000000000004")

USER_ADMIN_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
USER_PUBLICADOR_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")
USER_SOLUCIONADOR_ID = uuid.UUID("00000000-0000-0000-0000-000000000003")


ROLES = [
    {"id": ROLE_ADMIN_ID, "name": "admin", "description": "Administrator with full access"},
    {"id": ROLE_PUBLICADOR_ID, "name": "publicador", "description": "Organization that publishes challenges"},
    {"id": ROLE_SOLUCIONADOR_ID, "name": "solucionador", "description": "Student/solver that accepts challenges"},
    {"id": ROLE_EGRESADO_ID, "name": "egresado", "description": "Graduate looking for job offers"},
]

AVATAR = "/seed/avatares/{}.svg"
LAB = "Laboratorio de Innovación"


def _uid(n: int) -> uuid.UUID:
    return uuid.UUID(f"00000000-0000-0000-0000-{n:012d}")


EMPRESAS = [
    {
        "id": USER_PUBLICADOR_ID, "email": "contacto@artesaniasllamas.com", "password": "Publicador1234",
        "full_name": "Artesanías Llamas", "empresa_nombre": "Artesanías Llamas", "nit_empresa": "900.123.456-7",
        "phone": "+57 300 000 0001", "ubicacion": "Barranquilla, Atlántico",
        "bio": "Empresa familiar con más de 20 años fabricando hamacas, chinchorros y tejidos tradicionales de la costa colombiana.",
    },
    {
        "id": _uid(101), "email": "talento.malambo@empresas.vialibre.edu.co", "password": "Empresa1234",
        "full_name": "Agropecuaria Malambo S.A.S.", "empresa_nombre": "Agropecuaria Malambo", "nit_empresa": "901.234.567-1",
        "phone": "+57 300 000 0002", "ubicacion": "Malambo, Atlántico",
        "bio": "Productores de mango de hilaza y frutales tropicales con 300 hectáreas en el Atlántico.",
    },
    {
        "id": _uid(102), "email": "rrhh.puertocaribe@empresas.vialibre.edu.co", "password": "Empresa1234",
        "full_name": "Puerto Caribe Logística S.A.", "empresa_nombre": "Puerto Caribe Logística", "nit_empresa": "900.778.120-4",
        "phone": "+57 300 000 0003", "ubicacion": "Barranquilla, Atlántico",
        "bio": "Operador logístico portuario: almacenamiento, distribución y transporte de carga en la región Caribe.",
    },
    {
        "id": _uid(103), "email": "talento.tecnocaribe@empresas.vialibre.edu.co", "password": "Empresa1234",
        "full_name": "TecnoCaribe Software S.A.S.", "empresa_nombre": "TecnoCaribe Software", "nit_empresa": "901.556.903-2",
        "phone": "+57 300 000 0004", "ubicacion": "Barranquilla, Atlántico (híbrido)",
        "bio": "Fábrica de software que desarrolla plataformas web y móviles para comercio, salud y logística.",
    },
    {
        "id": _uid(104), "email": "gestionhumana.marazul@empresas.vialibre.edu.co", "password": "Empresa1234",
        "full_name": "Clínica Mar Azul", "empresa_nombre": "Clínica Mar Azul", "nit_empresa": "890.112.334-5",
        "phone": "+57 300 000 0005", "ubicacion": "Puerto Colombia, Atlántico",
        "bio": "Clínica de mediana complejidad con servicios de urgencias, consulta externa e imágenes diagnósticas.",
    },
    {
        "id": _uid(105), "email": "seleccion.contadores@empresas.vialibre.edu.co", "password": "Empresa1234",
        "full_name": "Contadores Asociados del Atlántico", "empresa_nombre": "Contadores Asociados del Atlántico",
        "nit_empresa": "900.441.287-9", "phone": "+57 300 000 0006", "ubicacion": "Barranquilla, Atlántico",
        "bio": "Firma de contabilidad, revisoría fiscal y asesoría tributaria para pymes de la región.",
    },
]

ESTUDIANTES = [
    {
        "id": USER_SOLUCIONADOR_ID, "email": "leonardo@vialibre.edu.co", "password": "Solucionador1234",
        "full_name": "Leonardo Barraza", "programa_academico": "Ingeniería de Sistemas", "semestre": "8° semestre",
        "afiliacion_academica": "Rama Estudiantil IEEE", "avatar": "leonardo-barraza",
        "bio": "Estudiante de Ingeniería de Sistemas interesado en redes, ciberseguridad y desarrollo web. Cofundador de una empresa de software estudiantil.",
        "skills": ["Python", "Redes", "React", "Next.js", "FastAPI", "Docker", "ISO 27001"],
        "soft_skills": ["Trabajo en equipo", "Liderazgo", "Comunicación asertiva"],
        "linkedin_url": "https://www.linkedin.com/in/leonardo-barraza-demo", "github_url": "https://github.com/leobarrazaa",
        "experiencia": ["Desarrollo del prototipo ViaLibre (Next.js + FastAPI)", "Apoyo en inventario de red de la Rama IEEE"],
        "cv": False,  # se carga en vivo durante la demo
    },
    {
        "id": _uid(201), "email": "valentina.gomez@vialibre.edu.co", "password": "Estudiante1234",
        "full_name": "Valentina Gómez Ruiz", "programa_academico": "Ingeniería Industrial", "semestre": "9° semestre",
        "afiliacion_academica": LAB, "avatar": "valentina-gomez",
        "bio": "Me apasiona optimizar procesos con datos. Lideré en el Laboratorio de Innovación un reto de reducción de tiempos en una planta de alimentos.",
        "skills": ["Lean Manufacturing", "Excel avanzado", "Power BI", "Python", "Simulación (Arena)"],
        "soft_skills": ["Liderazgo", "Pensamiento crítico", "Resolución de problemas"],
        "linkedin_url": "https://www.linkedin.com/in/valentina-gomez-demo",
        "experiencia": ["Reto Laboratorio de Innovación: -18 % en tiempos de alistamiento", "Monitora de Investigación de Operaciones"],
    },
    {
        "id": _uid(202), "email": "andres.rojas@vialibre.edu.co", "password": "Estudiante1234",
        "full_name": "Andrés Felipe Rojas", "programa_academico": "Ingeniería de Sistemas", "semestre": "7° semestre",
        "afiliacion_academica": LAB, "avatar": "andres-rojas",
        "bio": "Desarrollador frontend en formación. Me gusta construir interfaces accesibles y rápidas para pequeños negocios.",
        "skills": ["JavaScript", "React", "Tailwind CSS", "Figma", "Node.js"],
        "soft_skills": ["Creatividad", "Aprendizaje autónomo", "Trabajo en equipo"],
        "github_url": "https://github.com/andres-rojas-demo", "portfolio_url": "https://andresrojas-demo.vercel.app",
        "experiencia": ["Tienda virtual para emprendimiento familiar", "Hackathon Caribe 2026: segundo lugar"],
    },
    {
        "id": _uid(203), "email": "mariana.castro@vialibre.edu.co", "password": "Estudiante1234",
        "full_name": "Mariana Castro Peña", "programa_academico": "Contaduría Pública", "semestre": "8° semestre",
        "afiliacion_academica": "Semillero de Finanzas Sostenibles", "avatar": "mariana-castro",
        "bio": "Estudiante de Contaduría con interés en tributaria y NIIF para pymes. Voluntaria del consultorio contable de la universidad.",
        "skills": ["NIIF para pymes", "Siigo", "Excel avanzado", "Declaración de renta", "Conciliaciones bancarias"],
        "soft_skills": ["Responsabilidad", "Atención al detalle", "Ética profesional"],
        "linkedin_url": "https://www.linkedin.com/in/mariana-castro-demo",
        "experiencia": ["Consultorio contable Unilibre: 40 declaraciones de renta", "Auxiliar contable (medio tiempo) en papelería local"],
    },
    {
        "id": _uid(204), "email": "sebastian.herrera@vialibre.edu.co", "password": "Estudiante1234",
        "full_name": "Sebastián Herrera Díaz", "programa_academico": "Derecho", "semestre": "9° semestre",
        "afiliacion_academica": "Consultorio Jurídico", "avatar": "sebastian-herrera",
        "bio": "Estudiante de Derecho enfocado en derecho laboral y comercial. Atiendo casos en el consultorio jurídico de la universidad.",
        "skills": ["Derecho laboral", "Contratos comerciales", "Derechos de petición", "Investigación jurídica"],
        "soft_skills": ["Argumentación", "Negociación", "Escucha activa"],
        "linkedin_url": "https://www.linkedin.com/in/sebastian-herrera-demo",
        "experiencia": ["Consultorio Jurídico: 25 casos laborales acompañados", "Concurso de oratoria jurídica 2025"],
        "cv": False,
    },
    {
        "id": _uid(205), "email": "daniela.ospina@vialibre.edu.co", "password": "Estudiante1234",
        "full_name": "Daniela Ospina Márquez", "programa_academico": "Ingeniería Ambiental", "semestre": "8° semestre",
        "afiliacion_academica": LAB, "avatar": "daniela-ospina",
        "bio": "Trabajo en soluciones de agua y suelos para el campo atlanticense. Me interesa la agricultura de precisión.",
        "skills": ["SIG (QGIS)", "Calidad de agua", "Gestión ambiental ISO 14001", "Python", "Muestreo de suelos"],
        "soft_skills": ["Trabajo de campo", "Comunicación con comunidades", "Adaptabilidad"],
        "linkedin_url": "https://www.linkedin.com/in/daniela-ospina-demo",
        "experiencia": ["Laboratorio de Innovación: mapa de riesgo hídrico para Malambo", "Semillero de Agua y Territorio"],
    },
    {
        "id": _uid(206), "email": "camilo.perez@vialibre.edu.co", "password": "Estudiante1234",
        "full_name": "Camilo Andrés Pérez", "programa_academico": "Administración de Empresas", "semestre": "7° semestre",
        "afiliacion_academica": "", "avatar": "camilo-perez",
        "bio": "Estudiante de Administración con experiencia en ventas y servicio al cliente. Busco práctica en mercadeo o logística.",
        "skills": ["Mercadeo digital", "CRM", "Excel", "Atención al cliente"],
        "soft_skills": ["Orientación al cliente", "Proactividad", "Comunicación"],
        "experiencia": ["Asesor comercial en almacén de tecnología (2 años)"],
        "disponible": False,
    },
]

EGRESADOS = [
    {
        "id": _uid(301), "email": "laura.restrepo@egresados.vialibre.edu.co", "password": "Egresado1234",
        "full_name": "Laura Restrepo Vega", "programa_academico": "Ingeniería de Sistemas", "anio_egreso": 2023,
        "avatar": "laura-restrepo", "ubicacion": "Barranquilla, Atlántico",
        "bio": "Ingeniera de Sistemas con 2 años de experiencia como desarrolladora backend en Python y Java.",
        "skills": ["Python", "Django", "PostgreSQL", "Docker", "AWS", "Java"],
        "soft_skills": ["Mentoría", "Trabajo remoto", "Comunicación"],
        "linkedin_url": "https://www.linkedin.com/in/laura-restrepo-demo", "github_url": "https://github.com/laura-restrepo-demo",
        "experiencia": ["Desarrolladora backend, empresa de pagos (2023-2026)", "Práctica en área de TI de cooperativa"],
    },
    {
        "id": _uid(302), "email": "jorge.mendoza@egresados.vialibre.edu.co", "password": "Egresado1234",
        "full_name": "Jorge Iván Mendoza", "programa_academico": "Contaduría Pública", "anio_egreso": 2022,
        "avatar": "jorge-mendoza", "ubicacion": "Soledad, Atlántico",
        "bio": "Contador público con experiencia en revisoría fiscal y nómina para pymes del sector comercio.",
        "skills": ["Revisoría fiscal", "Nómina electrónica", "Siigo", "World Office", "Medios magnéticos"],
        "soft_skills": ["Organización", "Confidencialidad", "Trabajo bajo presión"],
        "linkedin_url": "https://www.linkedin.com/in/jorge-mendoza-demo",
        "experiencia": ["Analista contable, distribuidora mayorista (2022-2026)"],
    },
    {
        "id": _uid(303), "email": "natalia.vergara@egresados.vialibre.edu.co", "password": "Egresado1234",
        "full_name": "Natalia Vergara Ortiz", "programa_academico": "Derecho", "anio_egreso": 2024,
        "avatar": "natalia-vergara", "ubicacion": "Barranquilla, Atlántico",
        "bio": "Abogada con énfasis en derecho laboral y seguridad social. Experiencia en conciliaciones y contratos.",
        "skills": ["Derecho laboral", "Seguridad social", "Conciliación", "Contratación"],
        "soft_skills": ["Negociación", "Redacción", "Empatía"],
        "linkedin_url": "https://www.linkedin.com/in/natalia-vergara-demo",
        "experiencia": ["Abogada junior, firma de asesoría laboral (2024-2026)"],
    },
    {
        "id": _uid(304), "email": "ricardo.polo@egresados.vialibre.edu.co", "password": "Egresado1234",
        "full_name": "Ricardo Polo Arrieta", "programa_academico": "Ingeniería Industrial", "anio_egreso": 2021,
        "avatar": "ricardo-polo", "ubicacion": "Malambo, Atlántico",
        "bio": "Ingeniero industrial con experiencia en mejora continua, indicadores de producción y gestión de bodegas.",
        "skills": ["Six Sigma (Green Belt)", "Gestión de inventarios", "SAP MM", "Power BI"],
        "soft_skills": ["Liderazgo de equipos", "Pensamiento analítico", "Toma de decisiones"],
        "experiencia": ["Supervisor de producción, planta de alimentos (2021-2026)"],
    },
]


def build_cv(person: dict) -> bytes:
    """Hoja de vida de una página para los perfiles de prueba."""
    margin, width = 56, A4_WIDTH - 112
    blue, gray = (0.114, 0.306, 0.847), (0.42, 0.45, 0.5)
    pdf = Pdf()
    pdf.rect(0, A4_HEIGHT - 120, A4_WIDTH, 120, blue)
    pdf.text(margin, A4_HEIGHT - 60, person["full_name"], 24, True, (1, 1, 1))
    nivel = person.get("semestre") or f"Egresado(a) {person.get('anio_egreso', '')}"
    pdf.text(margin, A4_HEIGHT - 84, f"{person['programa_academico']} · {nivel}", 12, False, (0.86, 0.9, 1))
    contacto = " · ".join(filter(None, [person["email"], person.get("ubicacion") or "Barranquilla, Atlántico"]))
    pdf.text(margin, A4_HEIGHT - 104, contacto, 10, False, (0.86, 0.9, 1))

    y = A4_HEIGHT - 160

    def section(title: str) -> None:
        nonlocal y
        pdf.text(margin, y, title.upper(), 11, True, blue)
        pdf.line(margin, y - 6, margin + width, y - 6)
        y -= 24

    section("Perfil")
    y = pdf.paragraph(margin, y, person["bio"], width, 11) - 10
    section("Formación")
    y = pdf.paragraph(margin, y, f"{person['programa_academico']} — Universidad Libre, Seccional Barranquilla ({nivel})", width, 11)
    if person.get("afiliacion_academica"):
        y = pdf.paragraph(margin, y, f"Vinculación: {person['afiliacion_academica']}", width, 11)
    y -= 10
    section("Experiencia y proyectos")
    for item in person.get("experiencia", []):
        y = pdf.paragraph(margin + 10, y, f"• {item}", width - 10, 11)
    y -= 10
    section("Habilidades técnicas")
    y = pdf.paragraph(margin, y, ", ".join(person["skills"]), width, 11) - 10
    section("Habilidades blandas")
    y = pdf.paragraph(margin, y, ", ".join(person["soft_skills"]), width, 11) - 10
    links = [person.get(k) for k in ("linkedin_url", "github_url", "portfolio_url") if person.get(k)]
    if links:
        section("Enlaces")
        for link in links:
            y = pdf.paragraph(margin, y, link, width, 10, color=gray)
    pdf.text(margin, 40, "Hoja de vida de demostración generada para el prototipo ViaLibre.", 8, False, gray)
    return pdf.output()


def _slug_filename(name: str) -> str:
    return f"Hoja de vida - {name}.pdf"


async def seed_roles(db: AsyncSession) -> dict[str, Role]:
    """Create roles if they don't exist. Returns name->Role mapping."""
    roles_map = {}
    for role_data in ROLES:
        result = await db.execute(select(Role).where(Role.name == role_data["name"]))
        existing = result.scalar_one_or_none()
        if existing:
            roles_map[role_data["name"]] = existing
        else:
            role = Role(**role_data)
            db.add(role)
            await db.flush()
            roles_map[role_data["name"]] = role
            print(f"  Role '{role_data['name']}' created.")
    return roles_map


PROFILE_FIELDS = (
    "full_name", "phone", "bio", "nit_empresa", "empresa_nombre", "programa_academico",
    "afiliacion_academica", "skills", "soft_skills", "linkedin_url", "github_url",
    "portfolio_url", "ubicacion", "semestre", "anio_egreso",
)


async def upsert_user(db: AsyncSession, data: dict, role: Role) -> None:
    result = await db.execute(select(User).where(User.email == data["email"]))
    user = result.scalar_one_or_none()
    created = user is None
    if created:
        user = User(id=data["id"], email=data["email"], password_hash=hash_password(data["password"]))
        db.add(user)
    user.role_id = role.id
    for field in PROFILE_FIELDS:
        if field in data:
            setattr(user, field, data[field] or None)
    if data.get("avatar"):
        user.avatar_url = AVATAR.format(data["avatar"])
    user.disponible = data.get("disponible", True)
    if role.name in ("solucionador", "egresado") and data.get("cv", True):
        user.cv_data = build_cv(data)
        user.cv_filename = _slug_filename(data["full_name"])
        user.cv_size = len(user.cv_data)
        user.cv_updated_at = datetime.utcnow()
    await db.flush()
    print(f"  User '{data['email']}' {'created' if created else 'updated'}.")


async def main():
    print("Seeding Vialibre auth database...")
    async with async_session() as db:
        try:
            roles = await seed_roles(db)
            await upsert_user(db, {
                "id": USER_ADMIN_ID, "email": "admin@vialibre.edu.co", "password": "Admin1234",
                "full_name": "Juan Camilo Llamas Cardenas", "programa_academico": "Ingeniería de Sistemas",
            }, roles["admin"])
            for data in EMPRESAS:
                await upsert_user(db, data, roles["publicador"])
            for data in ESTUDIANTES:
                await upsert_user(db, data, roles["solucionador"])
            for data in EGRESADOS:
                await upsert_user(db, data, roles["egresado"])
            await db.commit()
            print("Auth seed complete!")
        except Exception as e:
            await db.rollback()
            print(f"Error: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(main())
