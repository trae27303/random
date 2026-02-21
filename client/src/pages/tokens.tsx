import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { CheckCircle, DollarSign } from "lucide-react";

export default function TokensPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  if (!user) {
    setLocation("/auth");
    return null;
  }

  const handlePurchase = async (amount: number, price: number) => {
    try {
      await apiRequest("POST", "/api/tokens/add", { amount });
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Purchase Successful",
        description: `Added ${amount} tokens to your account.`,
      });
    } catch (err) {
      toast({
        title: "Purchase Failed",
        description: "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  const packages = [
    { amount: 100, price: 5 },
    { amount: 500, price: 20 },
    { amount: 1000, price: 35 },
  ];

  return (
    <div className="min-h-screen bg-background p-8 flex items-center justify-center">
      <div className="max-w-4xl w-full">
        <h1 className="text-3xl font-bold mb-8 text-center">Purchase Tokens</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <Card key={pkg.amount} className="relative overflow-hidden border-2 hover:border-primary transition-colors">
              <CardHeader className="text-center">
                <CardTitle className="text-4xl font-bold text-primary">{pkg.amount}</CardTitle>
                <p className="text-muted-foreground">Tokens</p>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-2xl font-bold mb-4">${pkg.price}</div>
                <ul className="text-sm text-left space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {pkg.amount / 20} minutes of talk time
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    HD Video Calls
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => handlePurchase(pkg.amount, pkg.price)}>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Buy Now (Test)
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={() => setLocation("/")}>Back to Home</Button>
        </div>
      </div>
    </div>
  );
}
