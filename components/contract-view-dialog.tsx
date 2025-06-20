"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { supabase, type Contract } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Calendar, CheckCircle, Clock } from "lucide-react"

interface ServiceRecord {
  id?: string
  contract_id: string
  service_date: string
  quarter_number: number
  year: number
  is_completed: boolean
  completed_date?: string
  notes?: string
}

interface ContractViewDialogProps {
  contract: Contract | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContractViewDialog({ contract, open, onOpenChange }: ContractViewDialogProps) {
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (contract && open) {
      generateServiceSchedule()
    }
  }, [contract, open])

  const generateServiceSchedule = async () => {
    if (!contract) return

    setLoading(true)

    try {
      // First, fetch existing service records
      const { data: existingRecords } = await supabase
        .from("service_records")
        .select("*")
        .eq("contract_id", contract.id)
        .order("service_date")

      const existingRecordsMap = new Map(
        existingRecords?.map((record) => [`${record.quarter_number}-${record.year}`, record]) || [],
      )

      // Generate service schedule based on contract type and period
      const scheduleData = generateScheduleData(contract)

      // Merge with existing records
      const mergedRecords = scheduleData.map((schedule) => {
        const key = `${schedule.quarter_number}-${schedule.year}`
        const existing = existingRecordsMap.get(key)

        return (
          existing || {
            contract_id: contract.id,
            service_date: schedule.service_date,
            quarter_number: schedule.quarter_number,
            year: schedule.year,
            is_completed: false,
            notes: "",
          }
        )
      })

      setServiceRecords(mergedRecords)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load service records",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const generateScheduleData = (contract: Contract) => {
    const startDate = new Date(contract.contract_start_date || contract.created_at)
    const contractPeriodMonths = contract.contract_period
    const scheduleData: Array<{
      service_date: string
      quarter_number: number
      year: number
    }> = []

    let intervalMonths = 12 // Default to annual
    if (contract.contract_type === "Quarterly Service") {
      intervalMonths = 3
    } else if (contract.contract_type === "Half-year Service") {
      intervalMonths = 6
    }

    let currentDate = new Date(startDate)
    let quarterNumber = 1
    let currentYear = startDate.getFullYear()

    while (currentDate <= new Date(startDate.getTime() + contractPeriodMonths * 30.44 * 24 * 60 * 60 * 1000)) {
      scheduleData.push({
        service_date: currentDate.toISOString().split("T")[0],
        quarter_number: quarterNumber,
        year: currentYear,
      })

      // Move to next service date
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + intervalMonths, currentDate.getDate())

      // Update quarter and year tracking
      if (contract.contract_type === "Quarterly Service") {
        quarterNumber++
        if (quarterNumber > 4) {
          quarterNumber = 1
          currentYear++
        }
      } else if (contract.contract_type === "Half-year Service") {
        quarterNumber = quarterNumber === 1 ? 2 : 1
        if (quarterNumber === 1) {
          currentYear++
        }
      } else {
        quarterNumber = 1
        currentYear++
      }
    }

    return scheduleData
  }

  const handleServiceToggle = async (index: number, checked: boolean) => {
    const record = serviceRecords[index]
    const updatedRecord = {
      ...record,
      is_completed: checked,
      completed_date: checked ? new Date().toISOString().split("T")[0] : undefined,
    }

    try {
      if (record.id) {
        // Update existing record
        const { error } = await supabase
          .from("service_records")
          .update({
            is_completed: checked,
            completed_date: updatedRecord.completed_date,
            updated_at: new Date().toISOString(),
          })
          .eq("id", record.id)

        if (error) throw error
      } else {
        // Create new record
        const { data, error } = await supabase.from("service_records").insert([updatedRecord]).select().single()

        if (error) throw error
        updatedRecord.id = data.id
      }

      // Update local state
      const newRecords = [...serviceRecords]
      newRecords[index] = updatedRecord
      setServiceRecords(newRecords)

      toast({
        title: "Success",
        description: `Service ${checked ? "completed" : "unmarked"}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update service record",
        variant: "destructive",
      })
    }
  }

  const handleNotesChange = async (index: number, notes: string) => {
    const record = serviceRecords[index]

    try {
      if (record.id) {
        const { error } = await supabase
          .from("service_records")
          .update({ notes, updated_at: new Date().toISOString() })
          .eq("id", record.id)

        if (error) throw error
      }

      // Update local state
      const newRecords = [...serviceRecords]
      newRecords[index] = { ...record, notes }
      setServiceRecords(newRecords)
    } catch (error) {
      console.error("Failed to update notes:", error)
    }
  }

  const getServiceLabel = (record: ServiceRecord) => {
    if (contract?.contract_type === "Quarterly Service") {
      return `Q${record.quarter_number} ${record.year}`
    } else if (contract?.contract_type === "Half-year Service") {
      return `H${record.quarter_number} ${record.year}`
    } else {
      return `Annual ${record.year}`
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusIcon = (record: ServiceRecord) => {
    if (record.is_completed) {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    }

    const serviceDate = new Date(record.service_date)
    const today = new Date()

    if (serviceDate < today) {
      return <Clock className="w-4 h-4 text-red-500" />
    }

    return <Calendar className="w-4 h-4 text-blue-500" />
  }

  if (!contract) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Service Schedule - {contract.customers?.company}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contract Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Contract Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Equipment:</span>
                <p>{contract.equipment_type}</p>
              </div>
              <div>
                <span className="font-medium">Brand:</span>
                <p>{contract.brand}</p>
              </div>
              <div>
                <span className="font-medium">Contract Type:</span>
                <p>{contract.contract_type}</p>
              </div>
              <div>
                <span className="font-medium">Period:</span>
                <p>{contract.contract_period} months</p>
              </div>
            </div>
          </div>

          {/* Service Schedule */}
          <div>
            <h3 className="font-semibold mb-4">Service Schedule</h3>
            {loading ? (
              <div className="text-center py-8">Loading service schedule...</div>
            ) : (
              <div className="space-y-3">
                {serviceRecords.map((record, index) => (
                  <div key={`${record.quarter_number}-${record.year}`} className="border rounded-lg p-4">
                    <div className="flex items-start space-x-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={record.is_completed}
                          onCheckedChange={(checked) => handleServiceToggle(index, checked as boolean)}
                        />
                        {getStatusIcon(record)}
                      </div>

                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm font-medium">{getServiceLabel(record)}</Label>
                          <p className="text-sm text-gray-600">Due: {formatDate(record.service_date)}</p>
                          {record.is_completed && record.completed_date && (
                            <p className="text-sm text-green-600">Completed: {formatDate(record.completed_date)}</p>
                          )}
                        </div>

                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium">Notes</Label>
                          <Textarea
                            placeholder="Add service notes..."
                            value={record.notes || ""}
                            onChange={(e) => handleNotesChange(index, e.target.value)}
                            className="mt-1"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Services:</span>
                <p>{serviceRecords.length}</p>
              </div>
              <div>
                <span className="font-medium">Completed:</span>
                <p className="text-green-600">{serviceRecords.filter((r) => r.is_completed).length}</p>
              </div>
              <div>
                <span className="font-medium">Pending:</span>
                <p className="text-red-600">{serviceRecords.filter((r) => !r.is_completed).length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
