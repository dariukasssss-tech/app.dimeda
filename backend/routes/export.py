from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from datetime import datetime
import io
import csv
from core.database import db

router = APIRouter(prefix="/export", tags=["export"])

@router.get("/csv")
async def export_csv(data_type: str = "services"):
    if data_type == "services":
        records = await db.services.find({}, {"_id": 0}).to_list(10000)
        if not records:
            raise HTTPException(status_code=404, detail="No service records found")
        
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["id", "product_id", "technician_name", "service_type", "description", "issues_found", "warranty_status", "service_date", "created_at"])
        writer.writeheader()
        for record in records:
            writer.writerow(record)
        
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=service_records_{datetime.now().strftime('%Y%m%d')}.csv"}
        )
    
    elif data_type == "products":
        records = await db.products.find({}, {"_id": 0}).to_list(10000)
        if not records:
            raise HTTPException(status_code=404, detail="No products found")
        
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["id", "serial_number", "model_name", "city", "location_detail", "notes", "registration_date", "status"])
        writer.writeheader()
        for record in records:
            writer.writerow(record)
        
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=products_{datetime.now().strftime('%Y%m%d')}.csv"}
        )
    
    elif data_type == "issues":
        records = await db.issues.find({}, {"_id": 0, "photos": 0}).to_list(10000)
        if not records:
            raise HTTPException(status_code=404, detail="No issues found")
        
        products = await db.products.find({}, {"_id": 0}).to_list(10000)
        product_map = {p["id"]: p for p in products}
        
        output = io.StringIO()
        fieldnames = ["issue_type", "date", "resolved_date", "serial_number", "city", "technician_name", "warranty_status"]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        
        for record in records:
            product = product_map.get(record.get("product_id"), {})
            
            resolved_date = record.get("resolved_at")
            if resolved_date:
                try:
                    resolved_date = datetime.fromisoformat(resolved_date.replace("Z", "+00:00")).strftime("%Y-%m-%d")
                except:
                    pass
            else:
                resolved_date = "N/A"
            
            created_date = record.get("created_at", "")
            if created_date:
                try:
                    created_date = datetime.fromisoformat(created_date.replace("Z", "+00:00")).strftime("%Y-%m-%d")
                except:
                    pass
            
            warranty = record.get("warranty_status", "")
            if warranty == "warranty":
                warranty = "Warranty"
            elif warranty == "non_warranty":
                warranty = "Non Warranty"
            else:
                warranty = "N/A"
            
            writer.writerow({
                "issue_type": record.get("issue_type", ""),
                "date": created_date,
                "resolved_date": resolved_date,
                "serial_number": product.get("serial_number", "Unknown"),
                "city": product.get("city", "Unknown"),
                "technician_name": record.get("technician_name", "N/A"),
                "warranty_status": warranty,
            })
        
        output.seek(0)
        today = datetime.now().strftime("%Y-%m-%d")
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="Issue Report ({today}).csv"'}
        )
    
    raise HTTPException(status_code=400, detail="Invalid data type. Use: services, products, or issues")
