"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { supabase, type Customer } from "@/lib/supabase"
import { Edit, Eye, Trash2, Download } from "lucide-react"
import { AddCustomerDialog } from "./add-customer-dialog"
import { useToast } from "@/hooks/use-toast"

export function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [equipmentCounts, setEquipmentCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    setLoading(true)

    // Fetch customers
    const { data: customersData, error: customersError } = await supabase.from("customers").select("*").order("company")

    if (!customersError && customersData) {
      setCustomers(customersData)

      // Fetch equipment counts for each customer
      const counts: Record<string, number> = {}
      for (const customer of customersData) {
        const { count } = await supabase
          .from("contracts")
          .select("*", { count: "exact", head: true })
          .eq("customer_id", customer.id)

        counts[customer.id] = count || 0
      }
      setEquipmentCounts(counts)
    }

    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer? This will also delete all associated contracts."))
      return

    const { error } = await supabase.from("customers").delete().eq("id", id)

    if (!error) {
      toast({
        title: "Success",
        description: "Customer deleted successfully",
      })
      fetchCustomers()
    } else {
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      })
    }
  }

  const exportToCSV = () => {
    const csvContent = [
      ["Company", "Contact Person", "Email", "Phone", "Equipment Count"].join(","),
      ...customers.map((customer) =>
        [
          customer.company,
          customer.contact_person,
          customer.email || "",
          customer.phone || "",
          equipmentCounts[customer.id] || 0,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "customers.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading customers...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Customer List</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <AddCustomerDialog onCustomerAdded={fetchCustomers} />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Equipment Count</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  No customers found. Add your first customer to get started.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.company}</TableCell>
                  <TableCell>{customer.contact_person}</TableCell>
                  <TableCell>{equipmentCounts[customer.id] || 0}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {/* <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button> */}
                      <Button size="sm" variant="outline" onClick={() => handleDelete(customer.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={exportToCSV}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
