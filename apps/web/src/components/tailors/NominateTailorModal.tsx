'use client';

import React, { useState } from 'react';
import { TailorNomination } from './types';

export interface NominateTailorModalProps {
  initialCity?: string;
  onClose: () => void;
}

export function NominateTailorModal({
  initialCity = '',
  onClose,
}: NominateTailorModalProps) {
  const [formData, setFormData] = useState<TailorNomination>({
    tailorName: '',
    studioName: '',
    city: initialCity,
    specialty: 'suiting',
    nominatorEmail: '',
    websiteOrInstagram: '',
    notes: '',
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nominate-headline"
    >
      <div className="relative w-full max-w-lg bg-[#111318] border border-[#282D37] rounded-lg shadow-2xl p-6 sm:p-8 text-[#FBF9F5] my-8 animate-fadeIn">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[#707C94] hover:text-[#FBF9F5] p-2 rounded-full focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
          aria-label="Close dialog"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {!submitted ? (
          <div>
            <div className="border-b border-[#282D37] pb-4 mb-6">
              <span className="text-xs uppercase tracking-widest text-[#C5A059] font-medium">
                Atelier Network Expansion
              </span>
              <h2 id="nominate-headline" className="font-serif text-2xl font-bold text-[#FBF9F5] mt-1">
                Nominate a Master Tailor
              </h2>
              <p className="text-xs text-[#9AA4B8] mt-1 leading-relaxed">
                Recommend an exceptional bespoke cutter, couture dressmaker, or corsetry artisan
                for the Drape accreditation vetting network.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="tailor-name" className="block text-xs uppercase tracking-wider text-[#9AA4B8] font-medium mb-1">
                    Master Cutter Name <span className="text-[#A83232]">*</span>
                  </label>
                  <input
                    id="tailor-name"
                    type="text"
                    required
                    value={formData.tailorName}
                    onChange={(e) => setFormData({ ...formData, tailorName: e.target.value })}
                    placeholder="e.g. Matteo Rossi"
                    className="w-full px-3.5 py-2 bg-[#1C1F26] border border-[#3A414F] rounded text-sm text-[#FBF9F5] placeholder-[#707C94] focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
                <div>
                  <label htmlFor="nominate-studio-name" className="block text-xs uppercase tracking-wider text-[#9AA4B8] font-medium mb-1">
                    Atelier / Studio Name <span className="text-[#A83232]">*</span>
                  </label>
                  <input
                    id="nominate-studio-name"
                    type="text"
                    required
                    value={formData.studioName}
                    onChange={(e) => setFormData({ ...formData, studioName: e.target.value })}
                    placeholder="e.g. Sartoria Rossi Alta Moda"
                    className="w-full px-3.5 py-2 bg-[#1C1F26] border border-[#3A414F] rounded text-sm text-[#FBF9F5] placeholder-[#707C94] focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nominate-city" className="block text-xs uppercase tracking-wider text-[#9AA4B8] font-medium mb-1">
                    City / Metro <span className="text-[#A83232]">*</span>
                  </label>
                  <input
                    id="nominate-city"
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Rome, Berlin, Tokyo"
                    className="w-full px-3.5 py-2 bg-[#1C1F26] border border-[#3A414F] rounded text-sm text-[#FBF9F5] placeholder-[#707C94] focus:outline-none focus:border-[#C5A059]"
                  />
                </div>
                <div>
                  <label htmlFor="nominate-specialty" className="block text-xs uppercase tracking-wider text-[#9AA4B8] font-medium mb-1">
                    Primary Specialty
                  </label>
                  <select
                    id="nominate-specialty"
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#1C1F26] border border-[#3A414F] rounded text-sm text-[#FBF9F5] focus:outline-none focus:border-[#C5A059]"
                  >
                    <option value="suiting">Bespoke Suiting</option>
                    <option value="bridal">Bridal & Evening Gowns</option>
                    <option value="corsetry">Corsetry & Structure</option>
                    <option value="traditional">Traditional Cultural Attire</option>
                    <option value="other">Other Haute Craft</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="nominate-email" className="block text-xs uppercase tracking-wider text-[#9AA4B8] font-medium mb-1">
                  Your Contact Email <span className="text-[#A83232]">*</span>
                </label>
                <input
                  id="nominate-email"
                  type="email"
                  required
                  value={formData.nominatorEmail}
                  onChange={(e) => setFormData({ ...formData, nominatorEmail: e.target.value })}
                  placeholder="patron@drape.luxury"
                  className="w-full px-3.5 py-2 bg-[#1C1F26] border border-[#3A414F] rounded text-sm text-[#FBF9F5] placeholder-[#707C94] focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label htmlFor="nominate-website" className="block text-xs uppercase tracking-wider text-[#9AA4B8] font-medium mb-1">
                  Website, Instagram or Studio Address (Optional)
                </label>
                <input
                  id="nominate-website"
                  type="text"
                  value={formData.websiteOrInstagram}
                  onChange={(e) => setFormData({ ...formData, websiteOrInstagram: e.target.value })}
                  placeholder="https://instagram.com/atelier_handle"
                  className="w-full px-3.5 py-2 bg-[#1C1F26] border border-[#3A414F] rounded text-sm text-[#FBF9F5] placeholder-[#707C94] focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label htmlFor="nominate-notes" className="block text-xs uppercase tracking-wider text-[#9AA4B8] font-medium mb-1">
                  Craftsmanship Notes (Optional)
                </label>
                <textarea
                  id="nominate-notes"
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Detail their guild accreditations, fabric handling skills, or bespoke experience..."
                  className="w-full px-3.5 py-2 bg-[#1C1F26] border border-[#3A414F] rounded text-sm text-[#FBF9F5] placeholder-[#707C94] focus:outline-none focus:border-[#C5A059] resize-none"
                />
              </div>

              <div className="pt-4 border-t border-[#282D37] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded text-xs font-medium text-[#C9D0DD] hover:text-[#FBF9F5] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded bg-[#C5A059] text-[#11100F] font-semibold text-xs uppercase tracking-wider hover:bg-[#E0C792] transition-colors shadow-md"
                >
                  Submit Nomination
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-6 animate-fadeIn">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#14462B] flex items-center justify-center text-[#287D4E]">
              <svg className="w-6 h-6 text-[#EAF7F0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-xs uppercase tracking-widest text-[#C5A059] font-medium">
              Nomination Received
            </span>
            <h2 className="font-serif text-2xl font-bold text-[#FBF9F5] mt-1 mb-2">
              Thank You for Expanding Drape
            </h2>
            <p className="text-xs text-[#9AA4B8] max-w-sm mx-auto mb-6 leading-relaxed">
              Our master cutter accreditation guild audits portfolio plates and hand-finishing standards
              within five business days.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded bg-[#C5A059] text-[#11100F] font-semibold text-xs uppercase tracking-wider hover:bg-[#E0C792] transition-colors"
            >
              Return to Directory
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
