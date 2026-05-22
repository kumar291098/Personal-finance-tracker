import { apiClient, getUserId } from './client';

export interface Transaction {
  id: string;
  description: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  transactionDate: string;
  category: string;
  categoryId?: number;
}

export const getTransactions = async (): Promise<Transaction[]> => {
  const userId = await getUserId();
  if (!userId) throw new Error("User not logged in");
  
  return await apiClient(`/transactions/user/${userId}`);
};

export const addTransaction = async (data: Omit<Transaction, 'id'>) => {
  const userId = await getUserId();
  if (!userId) throw new Error("User not logged in");

  return await apiClient('/transactions/add', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      userId: Number(userId),
    }),
  });
};

export const updateTransaction = async (id: string, data: Omit<Transaction, 'id'>) => {
  const userId = await getUserId();
  if (!userId) throw new Error("User not logged in");

  return await apiClient(`/transactions/update/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      ...data,
      userId: Number(userId),
    }),
  });
};

export const deleteTransaction = async (transactionId: string) => {
  const userId = await getUserId();
  if (!userId) throw new Error("User not logged in");

  return await apiClient(`/transactions/delete/${transactionId}?userId=${userId}`, {
    method: 'DELETE',
  });
};
