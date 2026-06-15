"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

 

interface User {
    id: string;
    fullName: string;
    email: string;
    role: string;
    [key: string]: any;
}



interface UserContextType {
    users: User[];
    total: number;
    page: number;
    rowsPerPage: number;
    loadingUsers: boolean;
    roleFilter: string;
    setPage: (p: number) => void;
    setRowsPerPage: (r: number) => void;
    setRoleFilter: (role: string) => void;
    fetchUsers: (force?: boolean) => Promise<void>;
    refreshAll: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function useUserContext() {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error("useUserContext must be used within a UserProvider");
    }
    return context;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [users, setUsers] = useState<User[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [roleFilter, setRoleFilter] = useState("");
    const [userCache, setUserCache] = useState<Record<string, { users: User[], total: number }>>({});
    const initialFetchCalled = React.useRef(false);
    const isFetching = React.useRef(false);

    const fetchUsers = useCallback(async (force = false) => {
        const cacheKey = `${rowsPerPage}-${page * rowsPerPage}-${roleFilter}`;
        if (!force && userCache[cacheKey]) {
            setUsers(userCache[cacheKey].users);
            setTotal(userCache[cacheKey].total);
            return;
        }

        if (isFetching.current) return;
        isFetching.current = true;
        setLoadingUsers(true);
        try {
            const params = new URLSearchParams();
            params.set("limit", String(rowsPerPage));
            params.set("offset", String(page * rowsPerPage));
            if (roleFilter) params.set("role", roleFilter);

            const res = await fetch(`/api/users?${params.toString()}`);
            if (res.ok) {
                const usersData = await res.json();
                const rawData = Array.isArray(usersData) ? usersData : (usersData.users || usersData.data || []);
                const totalCount = usersData.total ?? (Array.isArray(usersData) ? usersData.length : 0);

                const mappedUsers = rawData.map((user: any) => ({
                    id: user.id,
                    fullName: user.name,
                    email: user.email,
                    role: user.role,
                    createdAt: user.created_at,
                    updatedAt: user.updated_at                     
                }));

                setUsers(mappedUsers);
                setTotal(totalCount);
                setUserCache(prev => ({ ...prev, [cacheKey]: { users: mappedUsers, total: totalCount } }));
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoadingUsers(false);
            isFetching.current = false;
        }
    }, [page, rowsPerPage, roleFilter, userCache]);

    // Helper to invalidate cache
    const clearCache = useCallback(() => setUserCache({}), []);

     

    const refreshAll = useCallback(async () => {
        clearCache();
        await fetchUsers(true);
    }, [fetchUsers, clearCache]);
 
    useEffect(() => {
        fetchUsers();
    }, [page, rowsPerPage, roleFilter, fetchUsers]);

    const value = {
        users,
        total,
        page,
        rowsPerPage,
        loadingUsers,
        roleFilter,
        setPage,
        setRowsPerPage,
        setRoleFilter,
        fetchUsers,
        refreshAll,
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
}
