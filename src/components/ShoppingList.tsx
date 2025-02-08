
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

const ShoppingList = () => {
  return (
    <Collapsible className="space-y-6">
      <CollapsibleTrigger className="w-full">
        <div className="bg-gradient-to-r from-primary-50 to-primary-100 p-6 rounded-lg shadow-sm flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary-700 mb-2">Lista de Compras</h1>
            <p className="text-primary-600 text-left">
              Lista completa de itens recomendados para sua jornada de modulação intestinal.
            </p>
          </div>
          <ChevronDown className="h-6 w-6 text-primary-600 transform transition-transform duration-200" />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold text-primary-700 mb-3">Hortaliças</h2>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>Abóbora, abobrinha, agrião</li>
                <li>Chuchu</li>
                <li>Alface (lisa, crespa e roxa)</li>
                <li>Rúcula, almeirão, acelga</li>
                <li>Alho, aspargo</li>
                <li>Berinjela, beterraba</li>
                <li>Brócolis</li>
                <li>Cebola, cenoura</li>
                <li>Couve, couve-chinesa</li>
                <li>Couve de Bruxelas, couve-flor</li>
                <li>Espinafre</li>
                <li>Nabo, pepino</li>
                <li>Rabanete</li>
                <li>Repolho (branco ou roxo)</li>
                <li>Salsão, tomate</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold text-primary-700 mb-3">Frutas</h2>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>Mamão</li>
                <li>Abacaxi</li>
                <li>Poncã, mexerica</li>
                <li>Abacate</li>
                <li>Coco</li>
                <li>Frutas vermelhas</li>
                <li>Kiwi</li>
                <li>Laranja, nectarina</li>
                <li>Limão</li>
                <li>Maçã</li>
                <li>Banana nanica e banana da terra (não muito maduras)</li>
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold text-primary-700 mb-3">Gorduras</h2>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>Manteiga GHEE</li>
                <li>Azeite de oliva</li>
                <li>Óleo de coco</li>
                <li>Leite de coco</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold text-primary-700 mb-3">Condimentos</h2>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>Canela</li>
                <li>Cúrcuma</li>
                <li>Orégano</li>
                <li>Cheiro verde</li>
                <li>Páprica (doce ou picante)</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold text-primary-700 mb-3">Chás</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-primary-600 mb-2">Diuréticos:</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-600">
                    <li>Cavalinha</li>
                    <li>Espinheira santa</li>
                    <li>Hibisco</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-primary-600 mb-2">Calmantes para melhorar o sono:</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-600">
                    <li>Camomila</li>
                    <li>Erva doce</li>
                    <li>Mulungu</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ShoppingList;
