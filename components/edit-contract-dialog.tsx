"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase, type Customer, type Contract, EQUIPMENT_TYPES, BRANDS, CONTRACT_TYPES } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface EditContractDialogProps {
  contract: Contract | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onContractUpdated: () => void
}

export function EditContractDialog({ contract, open, onOpenChange, onContractUpdated }: EditContractDialogProps) {
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    customer_id: "",
    equipment_type: "",
    brand: "",
    model: "",
    serial_number: "",
    last_service_date: "",
    contract_type: "",
    contract_period: "",
    contract_start_date: "",
    contract_end_date: "",
    remarks: "",
  })

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    if (contract && open) {
      setFormData({
        customer_id: contract.customer_id,
        equipment_type: contract.equipment_type,
        brand: contract.brand,
        model: contract.model || "",
        serial_number: contract.serial_number || "",
        last_service_date: contract.last_service_date || "",
        contract_type: contract.contract_type,
        contract_period: contract.contract_period.toString(),
        contract_start_date: contract.contract_start_date || "",
        contract_end_date: contract.contract_end_date || "",
        remarks: contract.remarks || "",
      })
    }
  }, [contract, open])

  const fetchCustomers = async () => {
    const { data, error } = await supabase.from("customers").select("*").order("company")

    if (!error && data) {
      setCustomers(data)
    }
  }

  const calculateEndDate = (startDate: string, period: string) => {
    if (!startDate || !period) return ""

    const start = new Date(startDate)
    const months = Number.parseInt(period)
    const end = new Date(start.getFullYear(), start.getMonth() + months, start.getDate())
    return end.toISOString().split("T")[0]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contract) return

    setLoading(true)

    try {
      const contractData = {
        ...formData,
        contract_period: Number.parseInt(formData.contract_period),
        contract_end_date: calculateEndDate(formData.contract_start_date, formData.contract_period),
        updated_at: new Date().toISOString(),
      }

      // Update the contract
      const { error: contractError } = await supabase.from("contracts").update(contractData).eq("id", contract.id)

      if (contractError) throw contractError

      // Check if contract type, period, or start date changed
      const scheduleChanged =
        formData.contract_type !== contract.contract_type ||
        Number.parseInt(formData.contract_period) !== contract.contract_period ||
        formData.contract_start_date !== contract.contract_start_date

      if (scheduleChanged) {
        // Delete existing service records that haven't been completed
        const { error: deleteError } = await supabase
          .from("service_records")
          .delete()
          .eq("contract_id", contract.id)
          .eq("is_completed", false)

        if (deleteError) {
          console.warn("Warning: Could not delete old service records:", deleteError)
        }

        // Generate new service schedule
        await generateNewServiceSchedule(contract.id, {
          contract_type: formData.contract_type,
          contract_period: Number.parseInt(formData.contract_period),
          contract_start_date: formData.contract_start_date,
        })
      }

      toast({
        title: "Success",
        description: "Contract updated successfully",
      })

      onOpenChange(false)
      onContractUpdated()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update contract",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const generateNewServiceSchedule = async (
    contractId: string,
    contractDetails: {
      contract_type: string
      contract_period: number
      contract_start_date: string
    },
  ) => {
    const { contract_type, contract_period, contract_start_date } = contractDetails

    if (!contract_start_date) return

    const startDate = new Date(contract_start_date)
    const serviceRecords: Array<{
      contract_id: string
      service_date: string
      quarter_number: number
      year: number
      is_completed: boolean
    }> = []

    let intervalMonths = 12 // Default to annual
    if (contract_type === "Quarterly Service") {
      intervalMonths = 3
    } else if (contract_type === "Half-year Service") {
      intervalMonths = 6
    }

    let currentDate = new Date(startDate)
    let quarterNumber = 1
    let currentYear = startDate.getFullYear()

    while (currentDate <= new Date(startDate.getTime() + contract_period * 30.44 * 24 * 60 * 60 * 1000)) {
      serviceRecords.push({
        contract_id: contractId,
        service_date: currentDate.toISOString().split("T")[0],
        quarter_number: quarterNumber,
        year: currentYear,
        is_completed: false,
      })

      // Move to next service date
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + intervalMonths, currentDate.getDate())

      // Update quarter and year tracking
      if (contract_type === "Quarterly Service") {
        quarterNumber++
        if (quarterNumber > 4) {
          quarterNumber = 1
          currentYear++
        }
      } else if (contract_type === "Half-year Service") {
        quarterNumber = quarterNumber === 1 ? 2 : 1
        if (quarterNumber === 1) {
          currentYear++
        }
      } else {
        quarterNumber = 1
        currentYear++
      }
    }

    // Insert new service records
    if (serviceRecords.length > 0) {
      const { error } = await supabase.from("service_records").insert(serviceRecords)
      if (error) {
        console.warn("Warning: Could not create new service records:", error)
      }
    }
  }

  if (!contract) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Contract</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer_id">Customer *</Label>
            <Select
              value={formData.customer_id}
              onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="equipment_type">Equipment Type *</Label>
            <Select
              value={formData.equipment_type}
              onValueChange={(value) => setFormData({ ...formData, equipment_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select equipment type" />
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand">Brand *</Label>
            <Select value={formData.brand} onValueChange={(value) => setFormData({ ...formData, brand: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                {BRANDS.map((brand) => (
                  <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serial_number">Serial Number</Label>
            <Input
              id="serial_number"
              value={formData.serial_number}
              onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_service_date">Last Service Date</Label>
            <Input
              id="last_service_date"
              type="date"
              value={formData.last_service_date}
              onChange={(e) => setFormData({ ...formData, last_service_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contract_type">Contract Type *</Label>
            <Select
              value={formData.contract_type}
              onValueChange={(value) => setFormData({ ...formData, contract_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select contract type" />
              </SelectTrigger>
              <SelectContent>
                {CONTRACT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contract_period">Contract Period (months) *</Label>
            <Input
              id="contract_period"
              type="number"
              min="1"
              value={formData.contract_period}
              onChange={(e) => setFormData({ ...formData, contract_period: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contract_start_date">Contract Start Date</Label>
            <Input
              id="contract_start_date"
              type="date"
              value={formData.contract_start_date}
              onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            />
          </div>

          {/* Warning message for schedule changes */}
          {contract &&
            (formData.contract_type !== contract.contract_type ||
              Number.parseInt(formData.contract_period) !== contract.contract_period ||
              formData.contract_start_date !== contract.contract_start_date) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Changing the contract type, period, or start date will regenerate the service
                  schedule. Uncompleted service records will be removed and new ones will be created.
                </p>
              </div>
            )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Contract"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
