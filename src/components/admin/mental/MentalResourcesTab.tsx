
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Phone, BookOpen, Link2 } from "lucide-react";

interface MentalResource {
  id: string;
  title: string;
  description?: string;
  content?: string;
  resource_type: 'emergency_contact' | 'educational_content' | 'useful_link';
  display_order: number;
  status: string;
  phone_number?: string;
  url?: string;
}

export const MentalResourcesTab = () => {
  const [resources, setResources] = useState<MentalResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [newResource, setNewResource] = useState<Partial<MentalResource>>({
    title: '',
    description: '',
    resource_type: 'emergency_contact',
    phone_number: '',
    url: '',
  });

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('mental_resources')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao carregar recursos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('mental_resources')
        .insert([{ ...newResource }])
        .select()
        .single();

      if (error) throw error;

      setResources([...resources, data]);
      setNewResource({
        title: '',
        description: '',
        resource_type: 'emergency_contact',
        phone_number: '',
        url: '',
      });
      toast.success('Recurso adicionado com sucesso');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao adicionar recurso');
    }
  };

  const deleteResource = async (id: string) => {
    try {
      const { error } = await supabase
        .from('mental_resources')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setResources(resources.filter(resource => resource.id !== id));
      toast.success('Recurso removido com sucesso');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao remover recurso');
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <Tabs defaultValue="emergency" className="w-full space-y-6">
      <TabsList>
        <TabsTrigger value="emergency">Contatos de Emergência</TabsTrigger>
        <TabsTrigger value="educational">Conteúdo Educativo</TabsTrigger>
        <TabsTrigger value="links">Links Úteis</TabsTrigger>
      </TabsList>

      <TabsContent value="emergency">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Contatos de Emergência
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Nome do Contato</Label>
                  <Input
                    id="title"
                    value={newResource.title}
                    onChange={e => setNewResource({ ...newResource, title: e.target.value, resource_type: 'emergency_contact' })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Número de Telefone</Label>
                  <Input
                    id="phone"
                    value={newResource.phone_number}
                    onChange={e => setNewResource({ ...newResource, phone_number: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit">Adicionar Contato</Button>
            </form>

            <div className="space-y-4">
              {resources
                .filter(resource => resource.resource_type === 'emergency_contact')
                .map(resource => (
                  <Card key={resource.id} className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">{resource.title}</h4>
                        <p className="text-sm text-muted-foreground">{resource.phone_number}</p>
                      </div>
                      <Button variant="destructive" onClick={() => deleteResource(resource.id)}>
                        Remover
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="educational">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Conteúdo Educativo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="eduTitle">Título</Label>
                  <Input
                    id="eduTitle"
                    value={newResource.title}
                    onChange={e => setNewResource({ ...newResource, title: e.target.value, resource_type: 'educational_content' })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={newResource.description}
                    onChange={e => setNewResource({ ...newResource, description: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="content">Conteúdo</Label>
                  <Textarea
                    id="content"
                    value={newResource.content}
                    onChange={e => setNewResource({ ...newResource, content: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit">Adicionar Conteúdo</Button>
            </form>

            <div className="space-y-4">
              {resources
                .filter(resource => resource.resource_type === 'educational_content')
                .map(resource => (
                  <Card key={resource.id} className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">{resource.title}</h4>
                        <Button variant="destructive" onClick={() => deleteResource(resource.id)}>
                          Remover
                        </Button>
                      </div>
                      {resource.description && (
                        <p className="text-sm text-muted-foreground">{resource.description}</p>
                      )}
                      {resource.content && (
                        <p className="text-sm">{resource.content}</p>
                      )}
                    </div>
                  </Card>
                ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="links">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Links Úteis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="linkTitle">Título</Label>
                  <Input
                    id="linkTitle"
                    value={newResource.title}
                    onChange={e => setNewResource({ ...newResource, title: e.target.value, resource_type: 'useful_link' })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    type="url"
                    value={newResource.url}
                    onChange={e => setNewResource({ ...newResource, url: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="linkDescription">Descrição</Label>
                  <Textarea
                    id="linkDescription"
                    value={newResource.description}
                    onChange={e => setNewResource({ ...newResource, description: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit">Adicionar Link</Button>
            </form>

            <div className="space-y-4">
              {resources
                .filter(resource => resource.resource_type === 'useful_link')
                .map(resource => (
                  <Card key={resource.id} className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">{resource.title}</h4>
                        <Button variant="destructive" onClick={() => deleteResource(resource.id)}>
                          Remover
                        </Button>
                      </div>
                      <a 
                        href={resource.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:underline"
                      >
                        {resource.url}
                      </a>
                      {resource.description && (
                        <p className="text-sm text-muted-foreground">{resource.description}</p>
                      )}
                    </div>
                  </Card>
                ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
