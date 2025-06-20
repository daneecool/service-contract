"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ContractList } from "@/components/contract-list"
import { CustomerList } from "@/components/customer-list"
import { Toaster } from "@/components/ui/toaster"

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("contracts")

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Service Contract Tracking System</h1>
          <p className="text-gray-600">Manage your service contracts and customer information efficiently</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="contracts">Contract List</TabsTrigger>
            <TabsTrigger value="customers">Customer List</TabsTrigger>
          </TabsList>

          <TabsContent value="contracts" className="space-y-4">
            <ContractList />
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            <CustomerList />
          </TabsContent>
        </Tabs>
      </div>
      <Toaster />
    </div>
  )
}
