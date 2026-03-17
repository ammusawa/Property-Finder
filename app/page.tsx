import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Search, Smartphone, CheckCircle2 } from 'lucide-react';

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-green-600 to-green-700 text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Find Your Dream Property in Nigeria
          </h1>
            <p className="text-xl md:text-2xl mb-8 text-green-100">
              Search, view, and request residential and commercial properties for sale and rent/lease
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/properties"
                className="inline-block bg-white text-green-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-100 transition text-center min-w-[180px]"
              >
                Browse Properties
              </Link>
              <Link
                href="/subscriptions"
                className="inline-block bg-white text-green-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-100 transition text-center min-w-[180px]"
              >
                Subscriptions
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Why Choose Property Finder?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <Search className="h-10 w-10 text-blue-600" strokeWidth={2} />
              <h3 className="text-xl font-semibold mb-2">Advanced Search</h3>
              <p className="text-gray-600">
                Filter by location, price, property type, and more to find exactly what you&apos;re looking for
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <Smartphone className="h-10 w-10 text-purple-600" strokeWidth={2} />
              <h3 className="text-xl font-semibold mb-2">Mobile Friendly</h3>
              <p className="text-gray-600">
                Optimized for mobile devices and works perfectly on 3G/4G networks across Nigeria
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" strokeWidth={2} />
              <h3 className="text-xl font-semibold mb-2">Verified Listings</h3>
              <p className="text-gray-600">
                All properties are verified and regularly updated to ensure accuracy
          </p>
        </div>
          </div>
        </section>

        {/* Popular Locations */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
              Popular Locations
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano', 'Enugu', 'Aba', 'Kaduna'].map((city) => (
                <Link
                  key={city}
                  href={`/properties?city=${city}`}
                  className="bg-green-50 hover:bg-green-100 p-4 rounded-lg text-center font-semibold text-gray-800 transition"
          >
                  {city}
                </Link>
              ))}
            </div>
        </div>
        </section>
      </main>
    </>
  );
}
