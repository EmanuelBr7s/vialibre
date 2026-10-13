"""Generador minimo de PDF de una pagina (A4) sin dependencias externas.

Cubre lo que necesitan la carta de aval y las hojas de vida de prueba:
texto en Helvetica / Helvetica-Bold con tildes (WinAnsiEncoding),
parrafos con ajuste de linea, rectangulos de color y lineas.

ponytail: ajuste de linea por ancho promedio de caracter y una sola pagina;
pasar a reportlab si se necesitan tablas, imagenes o varias paginas.
"""

import textwrap

A4_WIDTH, A4_HEIGHT = 595, 842

Color = tuple[float, float, float]


def _escape(text: str) -> bytes:
    raw = text.encode("cp1252", errors="replace")
    return raw.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)")


def _rgb(color: Color) -> str:
    return " ".join(f"{c:.3f}" for c in color)


class Pdf:
    def __init__(self) -> None:
        self._ops: list[bytes] = []

    def text(self, x: float, y: float, text: str, size: float = 11, bold: bool = False,
             color: Color = (0.1, 0.1, 0.1)) -> None:
        font = "F2" if bold else "F1"
        self._ops.append(
            f"BT {_rgb(color)} rg /{font} {size} Tf {x:.1f} {y:.1f} Td (".encode()
            + _escape(text)
            + b") Tj ET"
        )

    def paragraph(self, x: float, y: float, text: str, width: float, size: float = 11,
                  bold: bool = False, color: Color = (0.1, 0.1, 0.1),
                  leading: float | None = None) -> float:
        """Escribe texto con ajuste de linea y devuelve la y siguiente."""
        leading = leading or size * 1.45
        chars = max(10, int(width / (size * 0.5)))
        for block in text.split("\n"):
            for line in textwrap.wrap(block, chars) or [""]:
                self.text(x, y, line, size=size, bold=bold, color=color)
                y -= leading
        return y

    def rect(self, x: float, y: float, w: float, h: float, color: Color) -> None:
        self._ops.append(f"{_rgb(color)} rg {x:.1f} {y:.1f} {w:.1f} {h:.1f} re f".encode())

    def line(self, x1: float, y1: float, x2: float, y2: float, color: Color = (0.8, 0.8, 0.8),
             width: float = 1) -> None:
        self._ops.append(
            f"{_rgb(color)} RG {width} w {x1:.1f} {y1:.1f} m {x2:.1f} {y2:.1f} l S".encode()
        )

    def output(self) -> bytes:
        content = b"\n".join(self._ops)
        objects = [
            b"<< /Type /Catalog /Pages 2 0 R >>",
            b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {A4_WIDTH} {A4_HEIGHT}] "
            "/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>".encode(),
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
            f"<< /Length {len(content)} >>\nstream\n".encode() + content + b"\nendstream",
        ]
        out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        offsets = []
        for number, body in enumerate(objects, start=1):
            offsets.append(len(out))
            out += f"{number} 0 obj\n".encode() + body + b"\nendobj\n"
        xref = len(out)
        out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode()
        for offset in offsets:
            out += f"{offset:010d} 00000 n \n".encode()
        out += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
        return bytes(out)


if __name__ == "__main__":
    pdf = Pdf()
    pdf.text(50, 800, "Carta de aval (práctica) — señora Núñez", bold=True)
    end_y = pdf.paragraph(50, 780, "palabra " * 60, width=200)
    data = pdf.output()
    assert data.startswith(b"%PDF-1.4") and data.rstrip().endswith(b"%%EOF")
    assert b"\\(pr\xe1ctica\\)" in data, "tildes en cp1252 y parentesis escapados"
    assert end_y < 780 - 14 * 5, "el parrafo debe ocupar varias lineas"
    xref_at = int(data.rsplit(b"startxref\n", 1)[1].split(b"\n")[0])
    assert data[xref_at:xref_at + 4] == b"xref", "startxref apunta a la tabla xref"
    print("pdf ok")
