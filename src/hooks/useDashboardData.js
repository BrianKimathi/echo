import { useAsync } from './useAsync'
import { customerService } from '../services/customerService'
import { inquiryService } from '../services/inquiryService'
import { inventoryService } from '../services/inventoryService'
import { saleService } from '../services/salesService'
import { workshopService } from '../services/workshopService'
import { ntsaService } from '../services/ntsaService'
import { dispatchService } from '../services/dispatchService'
import { creditService } from '../services/creditService'

export const useDashboardData = () =>
  useAsync(async () => {
    const [customers, inquiries, vehicles, sales, workshop, ntsa, dispatch, credit] = await Promise.all([
      customerService.getAll(),
      inquiryService.getAll(),
      inventoryService.getAll(),
      saleService.getAll(),
      workshopService.getAll(),
      ntsaService.getAll(),
      dispatchService.getAll(),
      creditService.getAll(),
    ])
    return { customers, inquiries, vehicles, sales, workshop, ntsa, dispatch, credit }
  }, [])
