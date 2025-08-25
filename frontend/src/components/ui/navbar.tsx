import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ServerStatus } from '@/components/ServerStatus';

const Navbar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Início' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/produtos', label: 'Produtos' },
  ];

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
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    location.pathname === item.path
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <ServerStatus />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 