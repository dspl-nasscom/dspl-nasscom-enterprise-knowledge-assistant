"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
    Typography,
    Box,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Chip,
    TablePagination,
    TextField,
    Select,
    MenuItem,
    Button,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Avatar,
    IconButton,
    Tooltip,
    InputAdornment,
    alpha,
    useTheme,
    Divider,
    LinearProgress,
    FormControlLabel,
    Switch,
    Snackbar,
    Alert,
    AlertColor,
    CircularProgress,
} from "@mui/material";
import { v4 as uuidv4 } from "uuid";
import {
    Edit,
    Delete,
    Visibility,
    Add,
    Search,
    FilterList,
    Edit as EditIcon,
    EmailOutlined,
    BadgeOutlined,
    AdminPanelSettingsOutlined,
    PersonOutline,
    PersonOffOutlined,
    AssignmentInd
} from "@mui/icons-material";
import Link from "next/link";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";
import { useAuth } from "../.././../../contexts/AuthContext";
import { useUserContext } from "../../../../contexts/UserContext";

const UserManagement = () => {
    const theme = useTheme();
    const { 
        users, total, page, rowsPerPage, loadingUsers: contextLoading, 
        roleFilter, setRoleFilter,
        refreshAll, fetchUsers, setPage, setRowsPerPage 
    } = useUserContext();
    const [search, setSearch] = useState("");
    const [openDialog, setOpenDialog] = useState(false);
    const [newUser, setNewUser] = useState({ name: "", email: "", role: "User"});

    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: AlertColor;
    }>({
        open: false,
        message: "",
        severity: "success",
    });
    const [loading, setLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [openViewEditDialog, setOpenViewEditDialog] = useState(false);
    const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [originalUser, setOriginalUser] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [formErrors, setFormErrors] = useState({ name: false, email: false, role: false });

    const { currentUser } = useAuth();

    // Initial fetch handled by Context


    const STATUS_LABELS: Record<string, string> = {
        pending: "Pending",
        registered: "Registered",
        approved: "Approved",
        rejected: "Rejected",
    };

    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const name = user.fullName || "";
            const email = user.email || "";
            return (
                (name.toLowerCase().includes(search.toLowerCase()) ||
                    email.toLowerCase().includes(search.toLowerCase()))
            );
        });
    }, [search, users]);


    const handleChangePage = (_event: unknown, newPage: number) => setPage(newPage);
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(+event.target.value);
    };

    const handleUpdateUser = async () => {
        // Build diff payload
        const payload: any = { id: selectedUser.id };

        Object.keys(selectedUser).forEach((key) => {
            let newValue = selectedUser[key];
            let oldValue = originalUser[key];

            if (key === "fullName") {
                newValue = selectedUser.fullName;
                oldValue = originalUser.fullName;
                if (newValue !== oldValue) payload["name"] = newValue;
                return;
            }

            if (key === "role") {
                const normalizedNew = newValue?.charAt(0).toUpperCase() + newValue?.slice(1).toLowerCase();
                const normalizedOld = oldValue?.charAt(0).toUpperCase() + oldValue?.slice(1).toLowerCase();
                if (normalizedNew !== normalizedOld) payload["role"] = normalizedNew;
                return;
            }

            if (key === "isActive") return; // Skip isActive

            if (newValue !== oldValue) {
                payload[key] = newValue;
            }
        });


        // If no changes, skip API call
        if (Object.keys(payload).length === 1) {
            setSnackbar({ open: true, message: "No changes to update", severity: "info" });
            return;
        }

        setLoading(true); // Start loading
        try {
            const res = await fetch(`/api/users/${selectedUser.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setSnackbar({ open: true, message: "User updated!", severity: "success" });
                fetchUsers(true);
                setOpenViewEditDialog(false);
                if (selectedUser.email === currentUser.email) {
                    console.log("current login user")                  
                    
                    
                }
            } else {
                const errorData = await res.json();
                const errorMessage = errorData.detail || "Failed to update user!";
                setSnackbar({ open: true, message: errorMessage, severity: "error" });
                setOpenViewEditDialog(false);
            }
        } catch (error) {
            setSnackbar({ open: true, message: "An error occurred", severity: "error" });
        } finally {
            setLoading(false); // Stop loading
        }
    };


    const handleAddUser = async () => {
        const errors = {
            name: !newUser.name.trim(),
            email: !newUser.email.trim(),
            role: !newUser.role
        };

        setFormErrors(errors);

        if (Object.values(errors).some(v => v)) {
            setSnackbar({ open: true, message: "Please fill all required fields", severity: "warning" });
            return;
        }

        setLoading(true); // Start loading

        const payload = {
            name: newUser.name,
            email: newUser.email,
            role: newUser.role
        };

        try {
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setSnackbar({ open: true, message: "User added successfully!", severity: "success" });
                fetchUsers(true); // refresh list via context
                setNewUser({ name: "", email: "", role: "user"});
                setOpenDialog(false);
            } else {
                const errorData = await res.json();
                const errorMessage = errorData.detail || "Failed to add user!";
                setSnackbar({ open: true, message: errorMessage, severity: "error" });
                setOpenDialog(false);
            }
        } catch (error) {
            setSnackbar({ open: true, message: "An error occurred", severity: "error" });
        } finally {
            setLoading(false); // Stop loading
        }
    };

    // removed fetchUsers


    const handleReset = () => {
        setSearch('');
        setRoleFilter('');
    };

    const handleViewUser = (user: any) => {
        setSelectedUser(user);
        setOriginalUser(user);
        setIsEditMode(false);
        setOpenViewEditDialog(true);
    };

    const handleEditUser = (user: any) => {
        setSelectedUser(user);
        setOriginalUser(user);
        setIsEditMode(true);
        setOpenViewEditDialog(true);
    };


    const handleDeleteClick = (userId: string) => {
        setDeleteUserId(userId);
        setOpenDeleteDialog(true); // open confirmation
    };

    const handleConfirmDelete = async () => {
        if (!deleteUserId) return;
        setDeleting(true);

        try {
            // Call API to delete user
            const id = deleteUserId.trim();
            const res = await fetch(`/api/users/${id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete user");

            // Update local state
            // Update local state by forcing refetch
            fetchUsers(true);
            setOpenDeleteDialog(false);
            setDeleteUserId(null);
        } catch (error) {
            console.error(error);
            // optionally show snackbar
            setOpenDeleteDialog(false);
            setDeleteUserId(null);
        }
        finally {
            setDeleting(false);
        }
    };

    const handleCancelDelete = () => {
        setOpenDeleteDialog(false);
        setDeleteUserId(null);
    };

    const getRoleChip = (role: string) => {
        const isAdmin = role?.toLowerCase() === 'admin';
        return (
            <Chip
                label={role.toUpperCase()}
                size="small"
                variant="outlined"
                sx={{
                    fontWeight: 700,
                    fontSize: '10px',
                    borderColor: isAdmin ? theme.palette.secondary.main : theme.palette.divider,
                    color: isAdmin ? theme.palette.secondary.main : 'text.secondary'
                }}
            />
        );
    };

       

    return (
        <>
            <DashboardCard>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                    <Box>
                        <Typography variant="h5" fontWeight={700}>User Management</Typography>
                        <Typography variant="subtitle2" color="textSecondary">Manage system permissions and accounts</Typography>
                    </Box>
                    <Stack direction="row" spacing={2}>                         
                        <Button
                            variant="contained"
                            disableElevation
                            startIcon={<Add />}
                            onClick={() => setOpenDialog(true)}
                            sx={{ borderRadius: '8px', textTransform: 'none' }}
                        >
                            New User
                        </Button>
                    </Stack>
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={4} mt={1}>
                    <TextField
                        size="small"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        sx={{ flexGrow: 1 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel id="role-filter-label">Filter by Role</InputLabel>
                        <Select
                            labelId="role-filter-label"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            label="Filter by Role"
                        >
                            <MenuItem value="">All Roles</MenuItem>
                            <MenuItem value="Admin">Admin</MenuItem>
                            <MenuItem value="User">User</MenuItem>
                        </Select>
                    </FormControl>

                    <Button variant="contained" onClick={handleReset} disableElevation>Reset</Button>

                </Stack>

                <Box sx={{ overflow: "auto", mx: -3 }}>
                    <Table>
                        <TableHead sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, fontSize: '14px' }}>Name</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '14px' }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '14px' }}>Role</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '14px' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(loading || contextLoading) && (
                                <TableRow>
                                    <TableCell colSpan={7} sx={{ p: 0 }}>
                                        <LinearProgress />
                                    </TableCell>
                                </TableRow>
                            )}
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => {
                                    return (
                                        <TableRow key={user.id} hover>
                                            <TableCell>
                                                <Typography variant="subtitle2" fontWeight={600}>{user.fullName}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color="textSecondary">{user.email}</Typography>
                                            </TableCell>
                                            <TableCell>{getRoleChip(user.role)}</TableCell>
                                            {/* <TableCell>
                                                <Typography variant="subtitle2" fontWeight={600}>{user.status}</Typography>
                                            </TableCell> */}
                                            <TableCell align="center">
                                                <Stack direction="row" spacing={0.5} justifyContent="center">
                                                    <Tooltip title="View Profile"><IconButton size="small" color="primary" onClick={() => handleViewUser(user)}><Visibility fontSize="small" /></IconButton></Tooltip>
                                                    <Tooltip title="Edit User"><IconButton size="small" sx={{ color: 'info.dark' }} onClick={() => handleEditUser(user)}><Edit fontSize="small" /></IconButton></Tooltip>
                                                    <Tooltip title="Delete User">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleDeleteClick(user.id)}
                                                        >
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : !(loading || contextLoading) && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                                        <PersonOffOutlined sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                                        <Typography color="textSecondary">No users matching your search</Typography>
                                    </TableCell>
                                </TableRow>
                            )}

                        </TableBody>
                    </Table>

                    <TablePagination
                        component="div"
                        count={total}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        rowsPerPageOptions={[10, 25, 100]}
                    />
                </Box>


                <Dialog open={openDialog} onClose={() => { setOpenDialog(false); setFormErrors({ name: false, email: false, role: false }); }} fullWidth maxWidth="xs">
                    <DialogTitle sx={{ fontWeight: 700 }}>Add New User</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2" color="textSecondary" mb={3}>Fill in the details to add a new user. All fields are required.</Typography>
                        <Stack spacing={2.5}>
                            <TextField
                                label={<span>Full Name <span style={{ color: '#ff4d4d' }}>*</span></span>}
                                fullWidth
                                autoFocus
                                error={formErrors.name}
                                helperText={formErrors.name ? "Name is required" : ""}
                                value={newUser.name}
                                onChange={(e) => {
                                    setNewUser({ ...newUser, name: e.target.value });
                                    if (e.target.value) setFormErrors({ ...formErrors, name: false });
                                }}
                            />
                            <TextField
                                label={<span>Email Address <span style={{ color: '#ff4d4d' }}>*</span></span>}
                                fullWidth
                                error={formErrors.email}
                                helperText={formErrors.email ? "Email is required" : ""}
                                value={newUser.email}
                                onChange={(e) => {
                                    setNewUser({ ...newUser, email: e.target.value });
                                    if (e.target.value) setFormErrors({ ...formErrors, email: false });
                                }}
                            />
                            <FormControl fullWidth error={formErrors.role}>
                                <InputLabel>Assign Role <span style={{ color: '#ff4d4d' }}>*</span></InputLabel>
                                <Select
                                    value={newUser.role}
                                    label="Assign Role"
                                    onChange={(e) => {
                                        setNewUser({ ...newUser, role: e.target.value as string });
                                        if (e.target.value) setFormErrors({ ...formErrors, role: false });
                                    }}
                                >
                                    <MenuItem value="Admin">Admin</MenuItem>
                                    <MenuItem value="User">User</MenuItem>
                                </Select>
                                {formErrors.role && <Typography variant="caption" color="error" sx={{ ml: 2, mt: 0.5 }}>Role is required</Typography>}
                            </FormControl>                             
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 3 }}>
                        <Button onClick={() => setOpenDialog(false)} color="inherit" disabled={loading}>Cancel</Button>
                        <Button variant="contained" onClick={handleAddUser} disableElevation disabled={loading} startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}>
                            {loading ? "Adding..." : "Add user"}
                        </Button>
                    </DialogActions>
                </Dialog>
                <Dialog
                    open={openViewEditDialog}
                    onClose={() => setOpenViewEditDialog(false)}
                    fullWidth
                    maxWidth="xs"
                    PaperProps={{ sx: { borderRadius: 3 } }}
                >
                    <DialogTitle component="div" sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        pt: 3,
                        px: 3,
                        pb: 2
                    }}>
                        <Typography variant="h6" fontWeight={700} component="div">
                            {isEditMode ? "Edit Profile" : "User Profile"}
                        </Typography>
                        {/* Removed Active Chip */}
                    </DialogTitle>

                    <DialogContent sx={{ px: 3, pb: 2 }}>
                        {!selectedUser ? null : (
                            <Stack spacing={3} mt={1}>

                                {/* Header Section: Avatar & Identity */}
                                {!isEditMode &&
                                    <Box display="flex" alignItems="center" gap={2} mb={1}>
                                        <Avatar
                                            sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: '1.5rem' }}
                                        >
                                            {selectedUser.fullName?.charAt(0).toUpperCase()}
                                        </Avatar>
                                        <Box>
                                            {isEditMode ? (
                                                <TextField
                                                    fullWidth
                                                    label="Full Name"
                                                    variant="standard"
                                                    value={selectedUser.fullName}
                                                    onChange={(e) => setSelectedUser({ ...selectedUser, fullName: e.target.value })}
                                                />
                                            ) : (
                                                <>
                                                    <Typography variant="h5" fontWeight={600}>{selectedUser.fullName}</Typography>
                                                    <Typography variant="body2" color="text.secondary">ID: {selectedUser?.id?.slice(0, 8)}...</Typography>
                                                </>
                                            )}
                                        </Box>
                                    </Box>}

                                {!isEditMode && <Divider />}
                                {/* Details Grid */}
                                <Stack spacing={2.5}>

                                    {/* Name */}
                                    {isEditMode ? (
                                        <Box display="flex" alignItems="center" gap={1.5}>

                                            <TextField
                                                fullWidth
                                                label="Full Name"
                                                size="small"
                                                value={selectedUser.fullName}
                                                onChange={(e) => setSelectedUser({ ...selectedUser, fullName: e.target.value })}
                                            />

                                        </Box>) : (null)}

                                    {/* EMAIL */}
                                    <Box display="flex" alignItems="center" gap={1.5}>
                                        {!isEditMode ? (<EmailOutlined color="action" />) : null}
                                        {isEditMode ? (
                                            <TextField
                                                fullWidth
                                                label="Email Address"
                                                size="small"
                                                value={selectedUser.email}
                                                disabled
                                                onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                                            />
                                        ) : (
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" display="block">Email</Typography>
                                                <Typography variant="body1">{selectedUser.email}</Typography>
                                            </Box>
                                        )}
                                    </Box>

                                    {/* ROLE */}
                                    <Box display="flex" alignItems="center" gap={1.5}>
                                        {!isEditMode ? (<AdminPanelSettingsOutlined color="action" />) : null}
                                        {isEditMode ? (
                                            <FormControl fullWidth size="small">
                                                <InputLabel>Role</InputLabel>
                                                <Select
                                                    label="Role"
                                                    value={selectedUser.role === "Admin" || selectedUser.role === "admin" ? "Admin" : "User"}
                                                    onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
                                                >
                                                    <MenuItem value="Admin">Admin</MenuItem>
                                                    <MenuItem value="User">User</MenuItem>
                                                </Select>
                                            </FormControl>
                                        ) : (
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" display="block">Role</Typography>
                                                <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>{selectedUser.role}</Typography>
                                            </Box>
                                        )}
                                    </Box>

                                </Stack>


                                {/* FOOTER METADATA (Only in View Mode) */}
                                {/* {!isEditMode && (
                                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            Created: {new Date(selectedUser.createdAt).toLocaleDateString('en-US', {
                                                weekday: 'short',
                                                year: 'numeric',
                                                month: 'short',
                                                day: '2-digit'
                                            })} by {selectedUser.createdBy}
                                        </Typography>

                                        <Typography variant="caption" color="text.secondary" display="block">
                                            Last Updated: {new Date(selectedUser.updatedAt).toLocaleDateString('en-US', {
                                                weekday: 'short',
                                                year: 'numeric',
                                                month: 'short',
                                                day: '2-digit'
                                            })}
                                        </Typography>
                                    </Box>

                                )} */}
                            </Stack>
                        )}
                    </DialogContent>

                    <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
                        <Button onClick={() => setOpenViewEditDialog(false)} color="inherit" disabled={loading} sx={{ borderRadius: 2 }}>
                            {isEditMode ? "Cancel" : "Close"}
                        </Button>
                        {isEditMode ? (
                            <Button variant="contained" disableElevation onClick={handleUpdateUser} sx={{ borderRadius: 2 , color: "white"}} disabled={loading} startIcon={loading ? <CircularProgress size={20} sx={{color:'white'}} /> : null}>
                                {loading ? "Saving..." : "Save Changes"}
                            </Button>
                        ) : null}
                    </DialogActions>
                </Dialog>

                {/* Confirmation Dialog */}
                <Dialog open={openDeleteDialog} onClose={handleCancelDelete}>
                    <DialogTitle>Confirm Delete</DialogTitle>
                    <DialogContent>Are you sure you want to delete this user?</DialogContent>
                    <DialogActions>
                        <Button onClick={handleCancelDelete}>Cancel</Button>
                        <Button
                            color="error"
                            variant="contained"
                            onClick={handleConfirmDelete}
                            disabled={deleting} // prevent double click
                            startIcon={deleting ? <CircularProgress size={20} color="inherit" /> : null}
                        >
                            {deleting ? "Deleting..." : "Delete"}
                        </Button>

                    </DialogActions>
                </Dialog>                  
            </DashboardCard >
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar({ open: false, message: "", severity: "success" })}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert onClose={() => setSnackbar({ open: false, message: "", severity: "success" })} severity={snackbar.severity} sx={{ width: "100%" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default UserManagement;
