"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { supabase, type Contract } from "@/lib/supabase"
import { Edit, Eye, Trash2 } from "lucide-react"
import { AddContractDialog } from "./add-contract-dialog"
import { useToast } from "@/hooks/use-toast"
import { ContractViewDialog } from "./contract-view-dialog"
import { EditContractDialog } from "./edit-contract-dialog"

export function ContractList() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const [viewContract, setViewContract] = useState<Contract | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)

  // Add state for edit dialog
  const [editContract, setEditContract] = useState<Contract | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  useEffect(() => {
    fetchContracts()
  }, [])

  const fetchContracts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("contracts")
      .select(`
        *,
        customers (
          company,
          contact_person
        )
      `)
      .order("created_at", { ascending: false })

    if (!error && data) {
      setContracts(data)
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contract?")) return

    const { error } = await supabase.from("contracts").delete().eq("id", id)

    if (!error) {
      toast({
        title: "Success",
        description: "Contract deleted successfully",
      })
      fetchContracts()
    } else {
      toast({
        title: "Error",
        description: "Failed to delete contract",
        variant: "destructive",
      })
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString()
  }

  const handleView = (contract: Contract) => {
    setViewContract(contract)
    setViewDialogOpen(true)
  }

  // Update the handleEdit function
  const handleEdit = (contract: Contract) => {
    setEditContract(contract)
    setEditDialogOpen(true)
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading contracts...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Contract List</h2>
        <AddContractDialog onContractAdded={fetchContracts} />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Equipment</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Last Service Date</TableHead>
              <TableHead>Contract Type</TableHead>
              <TableHead>Contract Period</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  No contracts found. Add your first contract to get started.
                </TableCell>
              </TableRow>
            ) : (
              contracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell className="font-medium">{contract.customers?.company || "Unknown"}</TableCell>
                  <TableCell>{contract.equipment_type}</TableCell>
                  <TableCell>{contract.brand}</TableCell>
                  <TableCell>{formatDate(contract.last_service_date)}</TableCell>
                  <TableCell>{contract.contract_type}</TableCell>
                  <TableCell>{contract.contract_period} months</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleView(contract)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(contract)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(contract.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <ContractViewDialog contract={viewContract} open={viewDialogOpen} onOpenChange={setViewDialogOpen} />
      <EditContractDialog
        contract={editContract}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onContractUpdated={fetchContracts}
      />
    </div>
  )
}
