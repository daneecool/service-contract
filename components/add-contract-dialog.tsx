"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase, type Customer, EQUIPMENT_TYPES, BRANDS, CONTRACT_TYPES } from "@/lib/supabase"
import { Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AddContractDialogProps {
  onContractAdded: () => void
}

export function AddContractDialog({ onContractAdded }: AddContractDialogProps) {
  const [open, setOpen] = useState(false)
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
    setLoading(true)

    try {
      const contractData = {
        ...formData,
        contract_period: Number.parseInt(formData.contract_period),
        contract_end_date: calculateEndDate(formData.contract_start_date, formData.contract_period),
      }

      const { error } = await supabase.from("contracts").insert([contractData])

      if (error) throw error

      toast({
        title: "Success",
        description: "Contract added successfully",
      })

      setFormData({
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
      setOpen(false)
      onContractAdded()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add contract",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Contract
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Contract</DialogTitle>
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

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Contract"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
