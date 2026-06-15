import React from 'react';
import { Box, AppBar, Toolbar, styled, Stack, IconButton, Typography, Button, alpha } from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Profile from './Profile';
import { IconMenu } from '@tabler/icons-react';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useTheme } from '@mui/material/styles';

interface ItemType {
  toggleMobileSidebar: (event: React.MouseEvent<HTMLElement>) => void;
  toggleSidebar: (event: React.MouseEvent<HTMLElement>) => void;
  showToggle?: boolean;
}

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/users': 'User Management',
  '/chat': 'Knowledge Assistant',
  '/config': 'Configuration',
  '/tickets': 'Ticket Management',
  '/my-tickets': 'My Tickets',
};

const AppBarStyled = styled(AppBar)(({ theme }) => ({
  boxShadow: 'none',
  background: 'rgba(255, 255, 255, 0.88)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderBottom: '1px solid rgba(226, 232, 240, 0.9)',
  justifyContent: 'center',
  [theme.breakpoints.up('lg')]: { minHeight: '70px' },
}));

const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
  width: '100%',
  color: theme.palette.text.secondary,
  padding: '0 24px !important',
}));

const Header = ({ toggleMobileSidebar, toggleSidebar, showToggle = true}: ItemType) => {
  const { role } = useAuth();
  const theme = useTheme();
  const pathname = usePathname();
  const pageTitle = Object.entries(PAGE_TITLES).find(
    ([path]) => path === pathname || (path !== '/' && pathname.startsWith(path))
  )?.[1] ?? '';

  return (
    <AppBarStyled position="sticky" color="default">
      <ToolbarStyled>
        {/* Mobile menu button */}
        {showToggle && (
          <IconButton
            color="inherit"
            aria-label="menu"
            onClick={toggleMobileSidebar}
            sx={{ display: { lg: 'none', xs: 'inline-flex' }, mr: 1 }}
          >
            <IconMenu width="20" height="20" />
          </IconButton>
        )}

        {/* Desktop sidebar toggle */}
        {showToggle && (
          <IconButton
            color="inherit"
            aria-label="toggle sidebar"
            onClick={toggleSidebar}
            sx={{
              display: { lg: 'inline-flex', xs: 'none' },
              mr: 2,
              '&:hover': { background: 'rgba(13,78,210,0.06)' },
            }}
          >
            <IconMenu width="20" height="20" />
          </IconButton>
        )}

        {/* Page Title */}
        {pageTitle && (
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: '1rem',
              color: '#1E293B',
              display: { xs: 'none', sm: 'block' },
            }}
          >
            {pageTitle}
          </Typography>
        )}

        <Box flexGrow={1} />

        <Stack spacing={1.5} direction="row" alignItems="center">           
          <Profile />
        </Stack>
      </ToolbarStyled>
    </AppBarStyled>
  );
};

export default Header;
