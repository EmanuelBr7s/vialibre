import { FOCUS_RING, TOUCH_TARGET } from '@/components/ui/classes';

interface BannerProps {
  onCreateProblematica?: () => void;
  modalOpen?: boolean;
}

export default function Banner({ onCreateProblematica, modalOpen = false }: BannerProps) {
  return (
    <section
      aria-label="Bienvenida"
      className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 sm:p-8 text-white mb-8"
    >
      <h1 className="text-2xl sm:text-3xl font-bold">
        Bienvenido a ViaLibre
      </h1>
      <p className="text-base sm:text-lg text-primary-100 mt-2 max-w-2xl">
        Retos empresariales, prácticas y ofertas laborales: el puente entre las empresas y
        el talento de la Universidad Libre Seccional Barranquilla.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6">
        <a
          href="#module-panel"
          data-tour="explorar"
          className={`inline-flex items-center justify-center bg-white text-primary-600 px-6 rounded-lg font-medium hover:bg-primary-50 transition-colors text-center ${TOUCH_TARGET} ${FOCUS_RING}`}
        >
          Explorar publicaciones
        </a>
        {onCreateProblematica && (
          <button
            onClick={onCreateProblematica}
            data-tour="publicar"
            aria-expanded={modalOpen}
            aria-controls="create-challenge-dialog"
            aria-haspopup="dialog"
            className={`inline-flex items-center justify-center border border-white/30 text-white px-6 rounded-lg font-medium hover:bg-white/10 transition-colors ${TOUCH_TARGET} ${FOCUS_RING}`}
          >
            Publicar oferta o reto
          </button>
        )}
      </div>
    </section>
  );
}
