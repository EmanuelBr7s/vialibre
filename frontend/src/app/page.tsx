export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold text-center lg:text-left">
          VíaLibre
        </h1>
      </div>

      <div className="mt-16 text-center">
        <h2 className="text-2xl font-semibold mb-4">
          Conectando problemáticas con talento universitario
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Plataforma de crowdsourcing e innovación abierta para la 
          Universidad Libre Seccional Barranquilla
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
        <div className="p-6 border rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Publica Retos</h3>
          <p className="text-gray-600">
            Comparte problemáticas de tu empresa o sector productivo
          </p>
        </div>
        
        <div className="p-6 border rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Encuentra Soluciones</h3>
          <p className="text-gray-600">
            Estudiantes y profesionales proponen innovadoras soluciones
          </p>
        </div>
        
        <div className="p-6 border rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Conecta y Colabora</h3>
          <p className="text-gray-600">
            Desbloquea contactos y trabaja en equipo
          </p>
        </div>
      </div>
    </main>
  );
}
