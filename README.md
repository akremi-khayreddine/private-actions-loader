# dx-private-actions
 
## **Inputs**

### **`TOKEN`**
**Required**

### **`REPO`**
**Required**

### **`ACTION-PATH`**
**Optional**

## **Examples**

## Example usage

```yaml
- uses: distinctlab/dx-private-actions
  with:
    TOKEN: ${{ secrets.TOKEN }}
    REPO: akremi-khayreddine/dx-webhook
    JOB_NAME: 'test'
    JOB_STATUS: ${{ job.status }}
    RUN_ID: ${{ github.run_id }}
    PIPELINE_ID: private-actions-loader
```
