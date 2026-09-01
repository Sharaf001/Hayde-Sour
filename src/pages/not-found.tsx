import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from '@/lib/language';

export default function NotFound() {
  const { tr } = useTranslation();
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              {tr('404 Page Not Found', '404 الصفحة غير موجودة', '404 Page non trouvee')}
            </h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            {tr('Did you forget to add the page to the router?', 'هل نسيت إضافة الصفحة إلى جهاز التوجيه؟', 'Avez-vous oublie d\'ajouter la page au routeur ?')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
