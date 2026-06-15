"use client";

import { useMemo, useState, useEffect } from 'react';
import {
  Grid,
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Avatar,
  alpha,
  useTheme,
  LinearProgress, 
} from '@mui/material';
import { 
  AdminPanelSettingsOutlined,
  PeopleOutline, 
} from '@mui/icons-material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import { useUserContext } from '../../../contexts/UserContext';

interface User {
  fullName: string;
  email: string; 
}

const Dashboard = () => {
  const theme = useTheme();
  const { users, loadingUsers } = useUserContext(); 

  const stats = useMemo(() => {
    const admins = users.filter(u => u.role === 'admin').length;
    const totalUsers = users.filter(u => u.role === 'user').length; 

    return [       
      {
        title: 'Admin',
        count: admins,
        icon: <AdminPanelSettingsOutlined />,
        color: theme.palette.secondary.main,
        bg: alpha(theme.palette.secondary.main, 0.1)
      },
      {
        title: 'Users',
        count: totalUsers,
        icon: <PeopleOutline />,
        color: theme.palette.success.main,
        bg: alpha(theme.palette.success.main, 0.1)
      }
    ];
  }, [users, theme]);

 

  const isLoading = loadingUsers;

  return (
    <PageContainer title="Dashboard" description="Overview of users">
      <Box mt={2}>
        <Typography variant="h4" fontWeight={700} mb={4}>Dashboard Overview</Typography>

        {isLoading && <LinearProgress sx={{ mb: 4 }} />}

        <Grid container spacing={3} mb={5}>
          {stats.map((stat, index) => (
            <Grid key={index} size={{ xs: 12, sm: 4 }}>
              <Card variant="outlined" sx={{ border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderRadius: 3 }}>
                <CardContent sx={{ p: 4 }}>
                  <Stack direction="row" spacing={3} alignItems="center">
                    <Avatar
                      sx={{
                        bgcolor: stat.bg,
                        color: stat.color,
                        width: 56,
                        height: 56,
                        borderRadius: 2
                      }}
                    >
                      {stat.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="h3" fontWeight={800}>{stat.count}</Typography>
                      <Typography variant="subtitle2" color="textSecondary" fontWeight={600}>
                        {stat.title}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>   

         
      </Box>
    </PageContainer>
  );
}

export default Dashboard;
