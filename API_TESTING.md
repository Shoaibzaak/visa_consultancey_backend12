# API Testing Examples

## Using PowerShell (Windows)

### 1. Get All Clients
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/clients" -Method Get | ConvertTo-Json -Depth 10
```

### 2. Get Single Client (replace {id} with actual client ID)
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/clients/{id}" -Method Get | ConvertTo-Json -Depth 10
```

### 3. Create New Client
```powershell
$body = @{
    name = "Test User"
    country = "Canada"
    category = "Study Visa"
    status = "Pending"
    phone = "+92 300 9999999"
    email = "test@example.com"
    address = "Test Address"
    notes = "Test notes"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/clients" -Method Post -Body $body -ContentType "application/json" | ConvertTo-Json -Depth 10
```

### 4. Update Client (replace {id} with actual client ID)
```powershell
$body = @{
    status = "Approved"
    notes = "Application approved"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/clients/{id}" -Method Put -Body $body -ContentType "application/json" | ConvertTo-Json -Depth 10
```

### 5. Delete Client (replace {id} with actual client ID)
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/clients/{id}" -Method Delete | ConvertTo-Json -Depth 10
```

### 6. Get Clients by Status
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/clients/status/Pending" -Method Get | ConvertTo-Json -Depth 10
```

### 7. Get Clients by Category
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/clients/category/Study Visa" -Method Get | ConvertTo-Json -Depth 10
```

### 8. Health Check
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get | ConvertTo-Json -Depth 10
```

---

## Using cURL (Cross-platform)

### 1. Get All Clients
```bash
curl http://localhost:5000/api/clients
```

### 2. Get Single Client
```bash
curl http://localhost:5000/api/clients/{id}
```

### 3. Create New Client
```bash
curl -X POST http://localhost:5000/api/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "country": "Canada",
    "category": "Study Visa",
    "status": "Pending",
    "phone": "+92 300 9999999",
    "email": "test@example.com",
    "address": "Test Address",
    "notes": "Test notes"
  }'
```

### 4. Update Client
```bash
curl -X PUT http://localhost:5000/api/clients/{id} \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Approved",
    "notes": "Application approved"
  }'
```

### 5. Delete Client
```bash
curl -X DELETE http://localhost:5000/api/clients/{id}
```

### 6. Get Clients by Status
```bash
curl "http://localhost:5000/api/clients/status/Pending"
```

### 7. Get Clients by Category
```bash
curl "http://localhost:5000/api/clients/category/Study%20Visa"
```

### 8. Health Check
```bash
curl http://localhost:5000/api/health
```

---

## Using JavaScript (Fetch API)

### 1. Get All Clients
```javascript
fetch('http://localhost:5000/api/clients')
  .then(res => res.json())
  .then(data => console.log(data));
```

### 2. Create New Client
```javascript
fetch('http://localhost:5000/api/clients', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: "Test User",
    country: "Canada",
    category: "Study Visa",
    status: "Pending",
    phone: "+92 300 9999999",
    email: "test@example.com"
  })
})
  .then(res => res.json())
  .then(data => console.log(data));
```

### 3. Update Client
```javascript
fetch('http://localhost:5000/api/clients/{id}', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    status: "Approved",
    notes: "Application approved"
  })
})
  .then(res => res.json())
  .then(data => console.log(data));
```

### 4. Delete Client
```javascript
fetch('http://localhost:5000/api/clients/{id}', {
  method: 'DELETE'
})
  .then(res => res.json())
  .then(data => console.log(data));
```
