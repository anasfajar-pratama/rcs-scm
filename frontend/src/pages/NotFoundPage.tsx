import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="text-3xl font-bold text-gray-800">404</h1>
      <p className="mt-2 text-gray-600">Halaman tidak ditemukan.</p>
      <Link to="/" className="mt-4 text-brand-600 hover:underline">
        Kembali ke Dashboard
      </Link>
    </div>
  );
}