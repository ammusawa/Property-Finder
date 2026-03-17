'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, Crown, ShieldCheck, UserCheck } from 'lucide-react';
import Navbar from '@/components/Navbar';

// Define subscription plans
const plans = [
  {
    name: 'Basic Owner',
    target: 'Property Owners',
    price: 15000,
    duration: 'per year',
    description: 'Perfect for individuals listing 1-3 properties',
    features: [
      { text: 'List up to 3 properties', included: true },
      { text: 'Basic listing visibility', included: true },
      { text: 'Contact form inquiries', included: true },
      { text: 'Property analytics (basic)', included: true },
      { text: 'Featured listing placement', included: false },
      { text: 'Priority support', included: false },
      { text: 'Verified owner badge', included: false },
    ],
    icon: <UserCheck className="h-10 w-10 text-green-600" />,
    popular: false,
    color: 'green',
  },
  {
    name: 'Pro Agent',
    target: 'Real Estate Agents',
    price: 65000,
    duration: 'per year',
    description: 'Ideal for active agents managing multiple listings',
    features: [
      { text: 'Unlimited property listings', included: true },
      { text: 'Advanced analytics & insights', included: true },
      { text: 'Priority listing placement', included: true },
      { text: 'Verified agent badge', included: true },
      { text: 'Lead generation tools', included: true },
      { text: 'Dedicated support (chat + email)', included: true },
      { text: 'Agency profile page', included: true },
    ],
    icon: <ShieldCheck className="h-10 w-10 text-indigo-600" />,
    popular: true,
    color: 'indigo',
  },
  {
    name: 'Moderator Plus',
    target: 'Moderators & Power Users',
    price: 120000,
    duration: 'per year',
    description: 'For trusted moderators and high-volume users',
    features: [
      { text: 'All Pro Agent features', included: true },
      { text: 'Content moderation dashboard', included: true },
      { text: 'Early access to new features', included: true },
      { text: 'Custom branding options', included: true },
      { text: 'API access (limited)', included: true },
      { text: 'Priority feature requests', included: true },
      { text: 'Exclusive moderator community', included: true },
    ],
    icon: <Crown className="h-10 w-10 text-amber-600" />,
    popular: false,
    color: 'amber',
  },
];

export default function SubscriptionsPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Hero Section */}
        <section className="pt-16 pb-12 md:pt-24 md:pb-20 bg-green-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Choose Your Subscription Plan
            </h1>
            <p className="text-xl md:text-2xl mb-10 text-green-100 max-w-3xl mx-auto">
              Unlock powerful tools to list, manage, and grow your real estate presence on our platform.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl ${
                    plan.popular
                      ? 'border-2 border-indigo-500 scale-105 md:scale-110 z-10'
                      : 'border border-gray-200'
                  }`}
                  onMouseEnter={() => setSelectedPlan(plan.name)}
                  onMouseLeave={() => setSelectedPlan(null)}
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                      MOST POPULAR
                    </div>
                  )}

                  <div className="p-8 md:p-10">
                    <div className="flex justify-center mb-6">{plan.icon}</div>

                    <h3 className="text-2xl md:text-3xl font-bold text-center mb-2">
                      {plan.name}
                    </h3>

                    <p className="text-center text-gray-600 mb-6">{plan.target}</p>

                    <div className="text-center mb-8">
                      <span className="text-5xl md:text-6xl font-bold">
                        ₦{plan.price.toLocaleString()}
                      </span>
                      <span className="text-gray-600 block mt-1">{plan.duration}</span>
                    </div>

                    <p className="text-center text-gray-700 mb-8">{plan.description}</p>

                    <ul className="space-y-4 mb-10">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          {feature.included ? (
                            <CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="h-6 w-6 text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                          )}
                          <span className={feature.included ? 'text-gray-800' : 'text-gray-500'}>
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/auth/signin?plan=subscription"
                      className={`block w-full text-center py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
                        plan.popular
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {plan.popular ? 'Get Started' : 'Choose Plan'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* FAQ / Notes */}
            <div className="mt-16 md:mt-24 text-center max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-6">Important Information</h2>
              <p className="text-gray-600 mb-6">
                • All plans are billed annually • Cancel anytime from your dashboard • Prices include VAT
              </p>
              <p className="text-gray-600">
                Need a custom plan for your agency or organization?{' '}
                <Link href="/contact" className="text-green-600 font-medium hover:underline">
                  Contact our sales team →
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}