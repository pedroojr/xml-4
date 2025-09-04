import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ServerStatus } from '@/components/ServerStatus';
import SimpleNotifications from '@/components/Notifications/SimpleNotifications';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/', label: 'Início' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/notas-em-aberto', label: 'Notas em Aberto' },
  ];

  const handleNavigation = (path: string) => {
    if (location.pathname !== path) {
      // Usando navigate sem replace para preservar o histórico e forçar a remontagem
      navigate(path);
      // Forçando a atualização da página para garantir que o conteúdo seja recarregado
      window.location.href = path;
    }
  };

  return (
    <nav className="border-b bg-white">
      <div className="w-full px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-gray-800">
              NFE Import
            </Link>
          </div>
          
          <div className="hidden md:block">
            <div className="flex items-center space-x-4">
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={cn(
                    'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    location.pathname === item.path
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <SimpleNotifications />
            <ServerStatus />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;