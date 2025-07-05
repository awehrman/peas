export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-8xl font-bold text-green-600 mb-4 tracking-wider">
          peas
        </h1>
        <p className="text-xl text-green-700 mb-8">
          Welcome to the Peas Playground
        </p>
        <div className="text-sm text-green-500">
          Running on port 7355 (peas in numbers!)
        </div>
      </div>
    </div>
  );
} 