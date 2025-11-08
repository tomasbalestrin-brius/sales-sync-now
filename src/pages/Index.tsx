import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Calendar, Users } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center bg-primary rounded-full p-4 mb-6">
            <BarChart3 className="h-12 w-12 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-bold mb-4">Sales Tracker</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Substitua suas planilhas por um sistema inteligente de gestão comercial. 
            Monitore leads, agende calls e acompanhe vendas em tempo real.
          </p>
          <Button size="lg" onClick={() => navigate("/auth")}>
            Começar Agora
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center p-6 bg-card rounded-lg border border-border">
            <div className="bg-primary/10 rounded-full p-3 w-fit mx-auto mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-2">Gestão de Leads</h3>
            <p className="text-muted-foreground">
              Receba e organize leads de múltiplas fontes em tempo real
            </p>
          </div>

          <div className="text-center p-6 bg-card rounded-lg border border-border">
            <div className="bg-primary/10 rounded-full p-3 w-fit mx-auto mb-4">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-2">Agenda Inteligente</h3>
            <p className="text-muted-foreground">
              Agende calls e sincronize com Google Calendar automaticamente
            </p>
          </div>

          <div className="text-center p-6 bg-card rounded-lg border border-border">
            <div className="bg-primary/10 rounded-full p-3 w-fit mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-2">KPIs em Tempo Real</h3>
            <p className="text-muted-foreground">
              Acompanhe conversões, vendas e performance do time ao vivo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
