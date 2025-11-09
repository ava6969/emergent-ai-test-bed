'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Package } from 'lucide-react';

export default function ProductsPage() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiClient.getProducts(),
  });

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-6 bg-white">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-gray-600">Manage product documentation</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-600">Loading products...</div>
          </div>
        ) : products.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <Package className="h-16 w-16 mx-auto text-gray-400" />
              <p className="text-gray-600">No products yet</p>
              <p className="text-sm text-gray-500">Products will appear here once created</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-lg border p-4">
                <h3 className="font-medium">{product.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                {product.documents && product.documents.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    {product.documents.length} document(s)
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
