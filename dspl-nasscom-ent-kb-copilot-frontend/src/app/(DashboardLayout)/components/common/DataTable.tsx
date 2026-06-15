"use client";
import React, { useState, useMemo, useEffect } from "react";
import {
  Typography, Box, Table, TableBody, TableCell, TableHead, TableRow,
  TablePagination, TextField, Select, MenuItem, Button, Stack,
  FormControl, InputLabel, InputAdornment, alpha, useTheme,
  LinearProgress, Tooltip, IconButton
} from "@mui/material";
import { Search, Add, PersonOffOutlined } from "@mui/icons-material";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  align?: "left" | "center" | "right";
}

interface GenericProps<T> {
  title: string;
  subtitle: string;
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  isDropdownFilter: boolean;
  onAddClick?: () => void;
  showAddButton?: boolean;
  renderActions: (item: T) => React.ReactNode;
  searchPlaceholder?: string;
  filterOptions?: { label: string; value: string }[];
  statusAccessor?: keyof T;
  // Controlled Search & Filter
  controlledSearch?: string;
  onSearchChange?: (val: string) => void;
  controlledFilter?: string;
  onFilterChange?: (val: string) => void;
  // Second dropdown filter (e.g. Assignee)
  secondFilterOptions?: { label: string; value: string }[];
  secondFilterLabel?: string;
  controlledSecondFilter?: string;
  onSecondFilterChange?: (val: string) => void;
  // Pagination props
  totalCount?: number;
  controlledPage?: number;
  controlledRowsPerPage?: number;
  onPageChange?: (newPage: number) => void;
  onRowsPerPageChange?: (newRowsPerPage: number) => void;
}

export function GenericManagementTable<T>({
  title, subtitle, data, columns, loading, isDropdownFilter, onAddClick, renderActions,
  searchPlaceholder = "Search...", filterOptions, statusAccessor, showAddButton = true,
  totalCount, controlledPage, controlledRowsPerPage, onPageChange, onRowsPerPageChange,
  controlledSearch, onSearchChange, controlledFilter, onFilterChange,
  secondFilterOptions, secondFilterLabel = "Filter", controlledSecondFilter, onSecondFilterChange
}: GenericProps<T>) {
  const theme = useTheme();
  const [internalSearch, setInternalSearch] = useState("");
  const [internalFilter, setInternalFilter] = useState("");
  const [internalPage, setInternalPage] = useState(0);
  const [internalRowsPerPage, setInternalRowsPerPage] = useState(10);

  const isControlled = totalCount !== undefined;
  const page = isControlled ? (controlledPage ?? 0) : internalPage;
  const rowsPerPage = isControlled ? (controlledRowsPerPage ?? 10) : internalRowsPerPage;
  const search = controlledSearch !== undefined ? controlledSearch : internalSearch;
  const filter = controlledFilter !== undefined ? controlledFilter : internalFilter;

  const filteredData = useMemo(() => {
    if (!data) return [];
    
    return data.filter((item: any) => {
      const searchStr = search.toLowerCase();
      
      // Specifically search relevant fields if they exist
      const searchFields = [
        item.id,
        item.ticket_id,
        item.title,
        item.filename,
        item.doc_type,
        item.description,
        item.assigned_to,
        item.reporter_email,
        item.author,
        item.name,
        item.email,
      ].filter(Boolean);

      // Only do client-side search if it's NOT controlled
      const matchesSearch = (controlledSearch !== undefined) 
        ? true 
        : (searchStr === "" || searchFields.some(
            field => String(field).toLowerCase().includes(searchStr)
          ));

      // Only do client-side filter if it's NOT controlled
      let matchesFilter = true;
      if (controlledFilter === undefined && filter) {
        if (statusAccessor) {
          const val = item[statusAccessor];
          if (filter === "active") matchesFilter = val === true;
          else if (filter === "inactive") matchesFilter = val === false;
          else matchesFilter = String(val) === filter;
        } else {
          // Generic match against ALL object values if no statusAccessor
          matchesFilter = Object.values(item).some(v => String(v) === filter);
        }
      }
      
      return matchesSearch && matchesFilter;
    });
  }, [search, filter, data, statusAccessor, controlledSearch, controlledFilter]);


  const handleReset = () => {
    if (onSearchChange) onSearchChange('');
    else setInternalSearch('');
    
    if (onFilterChange) onFilterChange('');
    else setInternalFilter('');

    if (onSecondFilterChange) onSecondFilterChange('');
  };
 

  return (
    <DashboardCard>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>{title}</Typography>
          <Typography variant="subtitle2" color="textSecondary">{subtitle}</Typography>
        </Box>
        {showAddButton && (
          <Button variant="contained" startIcon={<Add />} onClick={onAddClick} sx={{ borderRadius: '8px' }}>
            Create New
          </Button>
        )}
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={4} mt={2}>
        <TextField
          size="small" placeholder={searchPlaceholder}
          value={search} onChange={(e) => {
            if (onSearchChange) onSearchChange(e.target.value);
            else setInternalSearch(e.target.value);
          }}
          sx={{ flexGrow: 1 }}
          InputProps={{ startAdornment: (<InputAdornment position="start"><Search fontSize="small" /></InputAdornment>) }}
        />
        {isDropdownFilter && filterOptions && (
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select value={filter} onChange={(e) => {
              if (onFilterChange) onFilterChange(e.target.value);
              else setInternalFilter(e.target.value);
            }} label="Status">
              <MenuItem value="">All</MenuItem>
              {filterOptions.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
            </Select>
          </FormControl>
        )}
        {secondFilterOptions && secondFilterOptions.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>{secondFilterLabel}</InputLabel>
            <Select
              value={controlledSecondFilter ?? ""}
              label={secondFilterLabel}
              onChange={(e) => onSecondFilterChange?.(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {secondFilterOptions.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Button variant="contained" onClick={handleReset} disableElevation>Reset</Button>

      </Stack>

      <Box sx={{ overflow: "auto", width: "100%" }}>
        <Table sx={{ minWidth: 700 }}>
          <TableHead sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05), }}>
            <TableRow>
              {columns.map((col, i) => (
                <TableCell key={i} align={col.align} sx={{
                  fontWeight: 700,
                  fontSize: '14px'
                }}>{col.header}</TableCell>
              ))}
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: '14px' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={columns.length + 1} sx={{ p: 0 }}><LinearProgress /></TableCell></TableRow>
            )}
            {filteredData.length > 0 ? (
              (isControlled ? filteredData : filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)).map((item: any, idx) => (
                <TableRow key={item.id || idx} hover>
                  {columns.map((col, i) => (
                    <TableCell key={i} align={col.align} sx={{ ontWeight: 'normal !important', fontSize: '14px' }}>
                      {typeof col.accessor === "function" ? col.accessor(item) : (item[col.accessor] as React.ReactNode)}
                    </TableCell>
                  ))}
                  <TableCell align="center">{renderActions(item)}</TableCell>
                </TableRow>
              ))
            ) : !loading && (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 8 }}>
                  <PersonOffOutlined sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography color="textSecondary">No data found</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={isControlled ? (totalCount ?? 0) : filteredData.length}
          page={page}
          onPageChange={(_, newPage) => {
            if (isControlled) {
              onPageChange?.(newPage);
            } else {
              setInternalPage(newPage);
            }
          }}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            const rpp = +e.target.value;
            if (isControlled) {
              onRowsPerPageChange?.(rpp);
            } else {
              setInternalRowsPerPage(rpp);
              setInternalPage(0);
            }
          }}
          rowsPerPageOptions={[10, 25, 100]}
        />

      </Box>
    </DashboardCard>
  );
}