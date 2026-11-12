"""
Seed script for Vialibre core-service.
Creates demo publications (retos, practicas y ofertas laborales) linked to
the companies created by the auth-service seed. Idempotent: existing rows
are updated with the demo data.

Usage:
  python -m app.seed_core   (desde la carpeta del servicio)
"""

import asyncio
import uuid
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models.challenge import Challenge, ChallengeStatus, ChallengeTipo, DifficultyLevel, Modalidad
from app.models.empresa import Empresa


def _uid(n: int) -> uuid.UUID:
    return uuid.UUID(f"00000000-0000-0000-0000-{n:012d}")


def _pub(n: int) -> uuid.UUID:
    return uuid.UUID(f"c0000000-0000-0000-0000-{n:012d}")


# These UUIDs must match the users created by auth-service seed
ARTESANIAS = _uid(2)
MALAMBO = _uid(101)
PUERTO_CARIBE = _uid(102)
TECNOCARIBE = _uid(103)
MAR_AZUL = _uid(104)
CONTADORES = _uid(105)

PORTADA = "/seed/portadas/{}.jpg"


def _emp(n: int) -> uuid.UUID:
    return uuid.UUID(f"e0000000-0000-0000-0000-{n:012d}")


# Registro institucional de cada empresa de la demo (panel de administración).
# Los datos reflejan las cuentas publicadoras del seed de auth-service.
EMPRESAS = [
    {"id": _emp(1), "publicador_user_id": ARTESANIAS, "razon_social": "Artesanías Llamas",
     "nit": "900.123.456-7", "sector": "Manufactura artesanal",
     "contacto_email": "contacto@artesaniasllamas.com", "contacto_telefono": "+57 300 000 0001"},
    {"id": _emp(2), "publicador_user_id": MALAMBO, "razon_social": "Agropecuaria Malambo S.A.S.",
     "nit": "901.234.567-1", "sector": "Agroindustria",
     "contacto_email": "talento.malambo@empresas.vialibre.edu.co", "contacto_telefono": "+57 300 000 0002"},
    {"id": _emp(3), "publicador_user_id": PUERTO_CARIBE, "razon_social": "Puerto Caribe Logística S.A.",
     "nit": "900.778.120-4", "sector": "Logística y transporte",
     "contacto_email": "rrhh.puertocaribe@empresas.vialibre.edu.co", "contacto_telefono": "+57 300 000 0003"},
    {"id": _emp(4), "publicador_user_id": TECNOCARIBE, "razon_social": "TecnoCaribe Software S.A.S.",
     "nit": "901.556.903-2", "sector": "Tecnología",
     "contacto_email": "talento.tecnocaribe@empresas.vialibre.edu.co", "contacto_telefono": "+57 300 000 0004"},
    {"id": _emp(5), "publicador_user_id": MAR_AZUL, "razon_social": "Clínica Mar Azul",
     "nit": "890.112.334-5", "sector": "Salud",
     "contacto_email": "gestionhumana.marazul@empresas.vialibre.edu.co", "contacto_telefono": "+57 300 000 0005"},
    {"id": _emp(6), "publicador_user_id": CONTADORES, "razon_social": "Contadores Asociados del Atlántico",
     "nit": "900.441.287-9", "sector": "Servicios contables",
     "contacto_email": "seleccion.contadores@empresas.vialibre.edu.co", "contacto_telefono": "+57 300 000 0006"},
]
NOW = datetime.utcnow()


def _in(days: int) -> datetime:
    return NOW + timedelta(days=days)


CHALLENGES = [
    # ── Retos empresariales (Laboratorio de Innovación) ──
    {
        "id": uuid.UUID("aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), "tipo": ChallengeTipo.RETO, "author_id": MALAMBO,
        "title": "Modelo predictivo para rendimiento de mango de hilaza",
        "short_description": "Buscamos estudiantes que apliquen Machine Learning (XGBoost, Random Forest) con variables agroclimáticas para predecir cosechas.",
        "long_description": """Agropecuaria Malambo enfrenta desafíos en la planificación de sus cosechas de mango de hilaza. Hoy las decisiones se basan en la experiencia y en observaciones directas, lo que genera pérdidas por sobreproducción o subproducción en distintas temporadas.

Buscamos un equipo que diseñe un modelo predictivo del rendimiento por hectárea usando:

- Temperatura media mensual
- Precipitación acumulada
- Humedad relativa del suelo
- Historial de rendimientos (últimos 5 años)
- Variedad del cultivar

El modelo debe predecir con 3 a 6 meses de anticipación y presentarse en un tablero interactivo para los administradores de la finca.

Tecnologías sugeridas: Python, scikit-learn, XGBoost, Pandas, Streamlit.""",
        "difficulty": DifficultyLevel.HARD, "tags": ["Python", "Machine Learning", "Agronomía", "Dashboard"],
        "image": "mango-hilaza", "modalidad": Modalidad.HIBRIDO, "ubicacion": "Malambo, Atlántico",
        "budget": 4500000, "deadline": _in(45), "is_featured": True, "featured_score": 9.5,
    },
    {
        "id": uuid.UUID("bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb"), "tipo": ChallengeTipo.RETO, "author_id": ARTESANIAS,
        "title": "Diseño de plataforma e-commerce y gestión de marca",
        "short_description": "Necesitamos digitalizar nuestro catálogo de hamacas y tejidos artesanales y posicionar la marca a nivel regional.",
        "long_description": """Artesanías Llamas es una empresa familiar dedicada a hamacas, chinchorros y tejidos tradicionales de la costa colombiana. Tenemos una marca reconocida localmente, pero casi ninguna presencia digital.

El reto consiste en:

- Un catálogo visual atractivo de los productos
- Compras en línea con pasarela de pago (PSE y tarjeta)
- Inventario sencillo para el taller
- Un blog que cuente la historia y las técnicas de tejido
- Diseño adaptado a celulares

Además, queremos apoyo con la identidad visual: logotipo, paleta de colores, tipografía y guía para redes sociales. Público objetivo: compradores de artesanías en Barranquilla, Santa Marta y Bogotá, de 25 a 55 años.""",
        "difficulty": DifficultyLevel.MEDIUM, "tags": ["E-commerce", "Branding", "React", "Diseño UI/UX"],
        "image": "ecommerce-artesanias", "modalidad": Modalidad.REMOTO, "ubicacion": "Barranquilla, Atlántico",
        "budget": 3000000, "deadline": _in(30), "is_featured": True, "featured_score": 8.8,
    },
    {
        "id": uuid.UUID("cccc3333-cccc-cccc-cccc-cccccccccccc"), "tipo": ChallengeTipo.RETO, "author_id": ARTESANIAS,
        "title": "Auditoría de seguridad y análisis de red (ISO 27001)",
        "short_description": "Se requiere un análisis de vulnerabilidades y el levantamiento de la estructura de red actual del taller y la tienda.",
        "long_description": """Con la llegada de la tienda en línea necesitamos un diagnóstico de la red y la seguridad informática del taller y del punto de venta.

Alcance:

- Levantamiento topológico de la red (diagrama)
- Identificación de dispositivos activos y vulnerabilidades
- Revisión de políticas de seguridad vigentes
- Evaluación de cumplimiento parcial frente a ISO 27001
- Informe con hallazgos y plan de mejora a 12 meses

Herramientas sugeridas: Nmap, OpenVAS, Wireshark.""",
        "difficulty": DifficultyLevel.HARD, "tags": ["Redes", "ISO 27001", "Pentesting", "Análisis"],
        "image": "auditoria-redes", "modalidad": Modalidad.PRESENCIAL, "ubicacion": "Barranquilla, Atlántico",
        "budget": 2000000, "deadline": _in(20), "is_featured": False, "featured_score": 7.5,
    },
    {
        "id": _pub(1), "tipo": ChallengeTipo.RETO, "author_id": PUERTO_CARIBE,
        "title": "Optimización de rutas de última milla en el área metropolitana",
        "short_description": "Queremos reducir kilómetros y tiempos de entrega de nuestra flota urbana con un modelo de ruteo.",
        "long_description": """Puerto Caribe Logística distribuye diariamente más de 600 pedidos en Barranquilla, Soledad, Malambo y Puerto Colombia con 18 vehículos. Las rutas se arman a mano cada mañana.

Buscamos un equipo que proponga:

- Un modelo de ruteo de vehículos con ventanas de tiempo (VRPTW)
- Una herramienta sencilla para que el despachador cargue los pedidos del día y obtenga las rutas
- Indicadores de ahorro frente a la operación actual

Contamos con 6 meses de históricos de pedidos y tiempos de entrega anonimizados.""",
        "difficulty": DifficultyLevel.HARD, "tags": ["Investigación de operaciones", "Python", "Logística", "OR-Tools"],
        "image": "rutas-ultima-milla", "modalidad": Modalidad.HIBRIDO, "ubicacion": "Barranquilla, Atlántico",
        "budget": 5000000, "deadline": _in(60), "is_featured": True, "featured_score": 9.0,
    },
    {
        "id": _pub(2), "tipo": ChallengeTipo.RETO, "author_id": MAR_AZUL,
        "title": "Asistente virtual para agendamiento de citas médicas",
        "short_description": "Diseñar un chatbot de WhatsApp que agende, confirme y reprograme citas de consulta externa.",
        "long_description": """El 40 % de las llamadas al call center de la Clínica Mar Azul son para agendar o cambiar citas, y en horas pico la espera supera los 15 minutos.

El reto es prototipar un asistente conversacional que:

- Agende citas según la disponibilidad de los especialistas
- Envíe recordatorios y permita confirmar o cancelar
- Escale al personal humano cuando el paciente lo pida
- Cumpla con la protección de datos personales (Ley 1581 de 2012)

Se valorarán propuestas accesibles para adultos mayores.""",
        "difficulty": DifficultyLevel.MEDIUM, "tags": ["Chatbot", "WhatsApp API", "Salud", "UX"],
        "image": "chatbot-citas", "modalidad": Modalidad.REMOTO, "ubicacion": "Puerto Colombia, Atlántico",
        "budget": 3500000, "deadline": _in(40), "is_featured": False, "featured_score": 8.0,
    },
    # ── Prácticas empresariales ──
    {
        "id": _pub(11), "tipo": ChallengeTipo.PRACTICA, "author_id": TECNOCARIBE,
        "title": "Practicante de desarrollo web",
        "short_description": "Únete al equipo que construye plataformas web para comercio y salud. Next.js, FastAPI y buenas prácticas desde el primer día.",
        "long_description": """Responsabilidades:
- Desarrollar componentes frontend en React / Next.js
- Construir y probar endpoints en FastAPI
- Participar en revisiones de código y ceremonias ágiles

Requisitos:
- Estudiante de Ingeniería de Sistemas de 7° semestre en adelante
- Conocimientos de JavaScript y Git

Ofrecemos: apoyo de sostenimiento, mentoría técnica y posibilidad de vinculación al terminar la práctica.""",
        "tags": ["React", "Next.js", "Python", "Git"], "image": "practica-web",
        "modalidad": Modalidad.HIBRIDO, "ubicacion": "Barranquilla, Atlántico", "budget": 1423500,
        "deadline": _in(25), "is_featured": True, "featured_score": 9.2,
    },
    {
        "id": _pub(12), "tipo": ChallengeTipo.PRACTICA, "author_id": CONTADORES,
        "title": "Practicante contable y tributario",
        "short_description": "Apoya la preparación de declaraciones, conciliaciones y reportes NIIF para clientes pyme.",
        "long_description": """Responsabilidades:
- Conciliaciones bancarias y causación de facturas
- Apoyo en declaraciones de IVA, retención y renta
- Preparación de reportes financieros bajo NIIF para pymes

Requisitos:
- Estudiante de Contaduría Pública de 7° semestre en adelante
- Manejo de Excel y algún software contable (Siigo, World Office)

Ofrecemos: apoyo de sostenimiento, horario de lunes a viernes y acompañamiento de un contador senior.""",
        "tags": ["NIIF", "Siigo", "Tributaria", "Excel"], "image": "practica-contable",
        "modalidad": Modalidad.PRESENCIAL, "ubicacion": "Barranquilla, Atlántico", "budget": 1423500,
        "deadline": _in(20), "is_featured": False, "featured_score": 7.8,
    },
    {
        "id": _pub(13), "tipo": ChallengeTipo.PRACTICA, "author_id": MALAMBO,
        "title": "Practicante de gestión ambiental",
        "short_description": "Acompaña el plan de manejo de agua y suelos de la finca y la certificación de buenas prácticas agrícolas.",
        "long_description": """Responsabilidades:
- Monitoreo de calidad de agua de riego y muestreo de suelos
- Apoyo en la documentación para certificación BPA (ICA)
- Mapas de zonas de riesgo con QGIS

Requisitos:
- Estudiante de Ingeniería Ambiental o afines
- Disponibilidad para trabajo de campo en Malambo

Ofrecemos: apoyo de sostenimiento, transporte desde Barranquilla y alimentación en finca.""",
        "tags": ["Gestión ambiental", "QGIS", "BPA", "Agua"], "image": "practica-ambiental",
        "modalidad": Modalidad.PRESENCIAL, "ubicacion": "Malambo, Atlántico", "budget": 1300000,
        "deadline": _in(35), "is_featured": False, "featured_score": 7.0,
    },
    {
        "id": _pub(14), "tipo": ChallengeTipo.PRACTICA, "author_id": PUERTO_CARIBE,
        "title": "Practicante jurídico en derecho laboral y comercial",
        "short_description": "Apoya al área legal en contratos con clientes, procesos laborales y respuesta a requerimientos.",
        "long_description": """Responsabilidades:
- Revisión y proyección de contratos comerciales
- Apoyo en procesos disciplinarios y respuesta a derechos de petición
- Seguimiento a procesos judiciales y vigilancia de términos

Requisitos:
- Estudiante de Derecho de 8° semestre en adelante
- Buena redacción y manejo de bases de datos jurídicas

Ofrecemos: apoyo de sostenimiento y la posibilidad de homologar la práctica con el consultorio jurídico.""",
        "tags": ["Derecho laboral", "Contratos", "Redacción jurídica"], "image": "practica-juridica",
        "modalidad": Modalidad.PRESENCIAL, "ubicacion": "Barranquilla, Atlántico", "budget": 1300000,
        "deadline": _in(30), "is_featured": False, "featured_score": 6.8,
    },
    {
        "id": _pub(15), "tipo": ChallengeTipo.PRACTICA, "author_id": MAR_AZUL,
        "title": "Practicante de analítica de datos en salud",
        "short_description": "Construye tableros de indicadores de oportunidad de citas, ocupación y satisfacción de pacientes.",
        "long_description": """Responsabilidades:
- Limpieza y modelado de datos asistenciales anonimizados
- Tableros en Power BI para la gerencia
- Apoyo en reportes a la Superintendencia de Salud

Requisitos:
- Estudiante de Ingeniería de Sistemas, Industrial o afines
- SQL básico y manejo de Excel o Power BI

Ofrecemos: apoyo de sostenimiento y horario flexible para clases.""",
        "tags": ["Power BI", "SQL", "Salud", "Indicadores"], "image": "practica-datos-salud",
        "modalidad": Modalidad.HIBRIDO, "ubicacion": "Puerto Colombia, Atlántico", "budget": 1423500,
        "deadline": _in(28), "is_featured": True, "featured_score": 8.4,
    },
    # ── Ofertas laborales (egresados) ──
    {
        "id": _pub(21), "tipo": ChallengeTipo.EMPLEO, "author_id": TECNOCARIBE,
        "title": "Desarrollador(a) backend junior",
        "short_description": "Buscamos egresado(a) con bases sólidas en Python y bases de datos para nuestro equipo de plataformas.",
        "long_description": """Responsabilidades:
- Diseñar y mantener APIs en FastAPI / Django
- Modelar bases de datos en PostgreSQL
- Escribir pruebas automatizadas y documentación

Requisitos:
- Ingeniero(a) de Sistemas o afín
- 1 año de experiencia (prácticas incluidas)
- Docker y Git

Ofrecemos: contrato a término indefinido, esquema híbrido y plan de formación.""",
        "tags": ["Python", "FastAPI", "PostgreSQL", "Docker"], "image": "empleo-backend",
        "modalidad": Modalidad.HIBRIDO, "ubicacion": "Barranquilla, Atlántico", "budget": 4200000,
        "deadline": _in(30), "is_featured": True, "featured_score": 9.1,
    },
    {
        "id": _pub(22), "tipo": ChallengeTipo.EMPLEO, "author_id": CONTADORES,
        "title": "Analista contable",
        "short_description": "Lleva la contabilidad de un portafolio de clientes pyme y apoya la revisoría fiscal.",
        "long_description": """Responsabilidades:
- Contabilidad completa de 8 a 10 clientes pyme
- Nómina electrónica y seguridad social
- Información exógena y declaraciones tributarias

Requisitos:
- Contador(a) público con tarjeta profesional
- 2 años de experiencia

Ofrecemos: contrato a término indefinido y auxilio de conectividad.""",
        "tags": ["Contabilidad", "Nómina", "Tributaria"], "image": "empleo-analista-contable",
        "modalidad": Modalidad.PRESENCIAL, "ubicacion": "Barranquilla, Atlántico", "budget": 3200000,
        "deadline": _in(22), "is_featured": False, "featured_score": 7.2,
    },
    {
        "id": _pub(23), "tipo": ChallengeTipo.EMPLEO, "author_id": PUERTO_CARIBE,
        "title": "Abogado(a) laboral junior",
        "short_description": "Asesora a la operación portuaria en relaciones laborales, contratación y seguridad social.",
        "long_description": """Responsabilidades:
- Asesoría en contratación y terminación de contratos
- Procesos disciplinarios y conciliaciones
- Respuesta a requerimientos del Ministerio del Trabajo

Requisitos:
- Abogado(a) con tarjeta profesional
- Experiencia o práctica en derecho laboral

Ofrecemos: contrato a término fijo renovable y bonificación por desempeño.""",
        "tags": ["Derecho laboral", "Seguridad social", "Conciliación"], "image": "empleo-abogado-laboral",
        "modalidad": Modalidad.PRESENCIAL, "ubicacion": "Barranquilla, Atlántico", "budget": 3800000,
        "deadline": _in(26), "is_featured": False, "featured_score": 7.0,
    },
    {
        "id": _pub(24), "tipo": ChallengeTipo.EMPLEO, "author_id": MALAMBO,
        "title": "Ingeniero(a) de procesos y bodega",
        "short_description": "Lidera indicadores de producción, inventarios y la mejora continua en la planta de empaque de fruta.",
        "long_description": """Responsabilidades:
- Indicadores de productividad y mermas en la planta de empaque
- Gestión de inventarios y despacho de fruta fresca
- Proyectos de mejora continua (Lean, 5S)

Requisitos:
- Ingeniero(a) Industrial
- 2 años de experiencia en producción o logística

Ofrecemos: contrato a término indefinido, transporte y alimentación.""",
        "tags": ["Lean", "Inventarios", "Producción", "Power BI"], "image": "empleo-ingeniero-procesos",
        "modalidad": Modalidad.PRESENCIAL, "ubicacion": "Malambo, Atlántico", "budget": 4000000,
        "deadline": _in(35), "is_featured": True, "featured_score": 8.6,
    },
]


async def seed_challenges(db: AsyncSession) -> None:
    """Create or update the demo publications."""
    for data in CHALLENGES:
        values = dict(data)
        values["image_url"] = PORTADA.format(values.pop("image"))
        values.setdefault("status", ChallengeStatus.ABIERTO)
        values.setdefault("difficulty", None)
        challenge = (
            await db.execute(select(Challenge).where(Challenge.id == values["id"]))
        ).scalar_one_or_none()
        created = challenge is None
        if created:
            challenge = Challenge(id=values["id"])
            db.add(challenge)
        for field, value in values.items():
            setattr(challenge, field, value)
        await db.flush()
        print(f"  [{values['tipo']}] '{values['title'][:50]}' {'created' if created else 'updated'}.")


async def seed_empresas(db: AsyncSession) -> None:
    """Create or update the institutional record of each demo company."""
    for data in EMPRESAS:
        empresa = (
            await db.execute(select(Empresa).where(Empresa.id == data["id"]))
        ).scalar_one_or_none()
        created = empresa is None
        if created:
            empresa = Empresa(id=data["id"])
            db.add(empresa)
        for field, value in data.items():
            setattr(empresa, field, value)
        await db.flush()
        print(f"  [empresa] '{data['razon_social']}' {'created' if created else 'updated'}.")


async def main():
    print("Seeding Vialibre core database...")
    async with async_session() as db:
        try:
            await seed_challenges(db)
            await seed_empresas(db)
            await db.commit()
            print("Core seed complete!")
        except Exception as e:
            await db.rollback()
            print(f"Error: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(main())
