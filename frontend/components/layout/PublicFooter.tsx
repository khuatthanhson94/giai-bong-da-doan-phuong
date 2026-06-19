"use client";

import Link from "next/link";
import { useTournament } from "@/hooks/useTournament";

export function PublicFooter() {
  const { tournamentName, settings } = useTournament();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-muted/30">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
        <div>
          <h3 className="mb-3 font-semibold text-primary">{tournamentName}</h3>
          <p className="text-sm text-muted-foreground">
            {settings.site_description || "Hệ thống quản lý và theo dõi giải bóng đá đoàn phường."}
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Liên kết</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/lich-thi-dau" className="hover:text-primary">Lịch thi đấu</Link></li>
            <li><Link href="/bang-xep-hang" className="hover:text-primary">Bảng xếp hạng</Link></li>
            <li><Link href="/tin-tuc" className="hover:text-primary">Tin tức</Link></li>
            <li><Link href="/lien-he" className="hover:text-primary">Liên hệ</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Thông tin</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/gioi-thieu" className="hover:text-primary">Giới thiệu</Link></li>
            <li><Link href="/dieu-le" className="hover:text-primary">Điều lệ</Link></li>
            <li><Link href="/nha-tai-tro" className="hover:text-primary">Nhà tài trợ</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Liên hệ</h4>
          <p className="text-sm text-muted-foreground">
            {settings.contact_email && <span className="block">{settings.contact_email}</span>}
            {settings.contact_phone && <span className="block">{settings.contact_phone}</span>}
            {settings.contact_address && <span className="block">{settings.contact_address}</span>}
          </p>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {year} {tournamentName}. Bản quyền thuộc ban tổ chức.
      </div>
    </footer>
  );
}
