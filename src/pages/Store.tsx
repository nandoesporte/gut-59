
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Loader2, Search } from "lucide-react";

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  type: 'physical' | 'digital';
  stock: number | null;
  images: string[] | null;
}

const Store = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Product[];
    },
  });

  const filteredProducts = products?.filter((product) =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <h1 className="text-2xl font-bold">Loja</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Buscar produtos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        </div>
      ) : filteredProducts?.length === 0 ? (
        <div className="text-center text-gray-500">
          Nenhum produto encontrado
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts?.map((product) => (
            <div
              key={product.id}
              className="overflow-hidden rounded-lg border bg-white shadow-sm"
            >
              <div className="aspect-square bg-gray-100">
                {product.images?.[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gray-100 text-gray-400">
                    Sem imagem
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold">{product.title}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {product.description || "Sem descrição"}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-lg font-bold">
                    R$ {product.price.toFixed(2)}
                  </span>
                  <Button size="sm">Adicionar</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Store;
