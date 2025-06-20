-- Insert sample customers
INSERT INTO customers (company, contact_person, email, phone, address) VALUES
('ABC Manufacturing', 'John Smith', 'john@abcmfg.com', '+1-555-0101', '123 Industrial Ave, City A'),
('XYZ Industries', 'Sarah Johnson', 'sarah@xyzind.com', '+1-555-0102', '456 Factory St, City B'),
('Tech Solutions Ltd', 'Mike Chen', 'mike@techsol.com', '+1-555-0103', '789 Business Blvd, City C')
ON CONFLICT DO NOTHING;

-- Insert sample contracts
INSERT INTO contracts (
  customer_id, 
  equipment_type, 
  brand, 
  model, 
  serial_number, 
  last_service_date, 
  contract_type, 
  contract_period,
  contract_start_date,
  contract_end_date,
  remarks
) 
SELECT 
  c.id,
  'Compressor',
  'Atlas Copco',
  'GA-15',
  'AC123456',
  '2024-01-15',
  'Quarterly Service',
  12,
  '2024-01-01',
  '2024-12-31',
  'Regular maintenance contract'
FROM customers c 
WHERE c.company = 'ABC Manufacturing'
ON CONFLICT DO NOTHING;
