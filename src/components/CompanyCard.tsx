"use client";

import React from "react";
import { Company } from "@/data";

export interface CompanyCardProps {
  company: Company;
  isAdmin?: boolean;
  onToggleSave?: (id: number) => void;
  onViewMore?: (c: Company) => void;
  onEdit?: (c: Company) => void;
  onDelete?: (id: number) => void;
}

const BookmarkIcon = ({ filled = false }: { filled?: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const LocationIcon = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const EditIcon = ({ size = 13 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = ({ size = 13 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export default function CompanyCard({
  company,
  isAdmin = false,
  onToggleSave,
  onViewMore,
  onEdit,
  onDelete,
}: CompanyCardProps) {
  return (
    <div className="bg-white rounded-[32px] shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col border border-slate-100 hover:border-slate-200/80 h-full group">
      {/* Card Image Banner */}
      <div className="relative h-[140px] bg-slate-100 overflow-hidden shrink-0">
        <img
          src={company.image}
          alt={company.name}
          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
        />

        {isAdmin ? (
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(company);
              }}
              className="w-8 h-8 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-[#0066FF] shadow-sm flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs"
              title="Edit Company"
            >
              <EditIcon size={13} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(company.id);
              }}
              className="w-8 h-8 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-red-600 shadow-sm flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs"
              title="Delete Company"
            >
              <TrashIcon size={13} />
            </button>
          </div>
        ) : onToggleSave ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(company.id);
            }}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm cursor-pointer ${
              company.saved
                ? "bg-[#0073ff] text-white"
                : "bg-white text-gray-400 hover:text-[#0073ff]"
            }`}
            title={company.saved ? "Unsave" : "Save Company"}
          >
            <BookmarkIcon filled={company.saved} />
          </button>
        ) : null}
      </div>

      {/* Card Body */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <div
            className="text-[16px] text-[#232323] leading-tight font-bold"
            style={{ fontFamily: "'DM Serif Text', serif" }}
          >
            {company.name}
          </div>
          {isAdmin && (
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0066FF] shrink-0">
              {company.industry}
            </span>
          )}
        </div>

        <div className="h-px bg-black/6 my-3" />

        <p className="text-[12px] text-gray-400 leading-relaxed line-clamp-3 flex-1">
          {company.description}
        </p>

        <div className="mt-3 flex flex-wrap gap-1">
          {company.specializations.slice(0, 2).map((s) => (
            <span
              key={s}
              className="text-[10px] text-[#0073ff] bg-[#dfe9ff] px-2 py-0.5 rounded-full font-medium"
            >
              {s}
            </span>
          ))}
          {company.specializations.length > 2 && (
            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full font-medium">
              +{company.specializations.length - 2}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-gray-400 flex items-center gap-1 truncate max-w-[170px]">
            <LocationIcon />
            <span className="truncate">{company.location.split(",")[1]?.trim() ?? company.location}</span>
          </span>
          <span className="text-[11px] text-[#059669] font-medium shrink-0">
            {company.slots} slots
          </span>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          {isAdmin ? (
            <>
              <button
                type="button"
                onClick={() => onEdit?.(company)}
                className="text-[11.5px] font-semibold text-[#0066FF] hover:underline cursor-pointer"
              >
                Edit Company →
              </button>
              {onViewMore && (
                <button
                  type="button"
                  onClick={() => onViewMore(company)}
                  className="text-[11px] text-slate-400 hover:text-[#0066FF] transition-colors cursor-pointer"
                >
                  preview card
                </button>
              )}
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={() => onViewMore?.(company)}
                className="text-[11px] text-gray-300 hover:text-[#0073ff] transition-colors cursor-pointer"
              >
                know more →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
