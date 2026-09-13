import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost/trisakti/api'
// const API_URL = import.meta.env.VITE_API_URL ?? 'http://10.17.17.245/trisakti/api'

export interface AdminAccount {
  id: number
  name: string
  status: boolean
}

export async function findAccount(
  name: string,
  password: string,
): Promise<AdminAccount> {
  const formData = new FormData()

  formData.append('name', name)
  formData.append('password', password)

  const response = await axios.post(`${API_URL}/UserAdmin.php`, formData)

  return response.data.data
}