"use client";

import { AdminHeader } from "@/components/layout/AdminHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import GroupSchedule from "./GroupSchedule";
import KnockoutBuilder from "./KnockoutBuilder";

export default function AdminSchedulePage() {
  return (
    <div className="space-y-6">
      <AdminHeader title="Tạo lịch thi đấu" />

      <Tabs defaultValue="group" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="group">Vòng bảng</TabsTrigger>
          <TabsTrigger value="knockout">Vòng knockout</TabsTrigger>
        </TabsList>
        <TabsContent value="group">
          <GroupSchedule />
        </TabsContent>
        <TabsContent value="knockout">
          <KnockoutBuilder />
        </TabsContent>
      </Tabs>
    </div>
  );
}
