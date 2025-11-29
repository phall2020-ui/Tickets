'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PortfolioSummary } from '@/types';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { CapacityChart } from '@/components/charts/CapacityChart';
import { ContractStatusChart } from '@/components/charts/ContractStatusChart';
import { Building2, Zap, PoundSterling, Calendar, TrendingUp, Award } from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  summary: PortfolioSummary;
  revenueHistory: { month: string; revenue: number; sites: number }[];
  capacityBySpv: { spv: string; capacity: number; contracted: number }[];
  topSites: { id: string; name: string; spv: string; capacity: number; monthlyFee: number }[];
  siteTypeBreakdown: { rooftop: number; groundMount: number };
  contractStatus: { contracted: number; nonContracted: number };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const result = await res.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Header title="Dashboard" subtitle="Portfolio Overview" />
        <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="flex flex-col h-full">
      <Header 
        title="Dashboard" 
        subtitle="Portfolio Overview" 
      />
      
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">
                Total Sites
              </CardTitle>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{summary?.totalSites || 0}</div>
              <p className="text-sm text-gray-500 mt-1">
                <span className="text-green-600 font-medium">{summary?.contractedSites || 0}</span> contracted
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-amber-600">
                Total Capacity
              </CardTitle>
              <div className="p-2 bg-amber-100 rounded-lg">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {formatNumber((summary?.totalCapacityKwp || 0) / 1000, 1)} MW
              </div>
              <p className="text-sm text-gray-500 mt-1">
                <span className="text-green-600 font-medium">
                  {formatNumber((summary?.contractedCapacityKwp || 0) / 1000, 1)} MW
                </span> contracted
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-600">
                Monthly Revenue
              </CardTitle>
              <div className="p-2 bg-green-100 rounded-lg">
                <PoundSterling className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {formatCurrency(summary?.totalMonthlyFee || 0)}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                <span className="text-green-600 font-medium">
                  {formatCurrency((summary?.totalMonthlyFee || 0) * 12)}
                </span> annually
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-purple-600">
                Current Tier
              </CardTitle>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{summary?.currentTier || 'N/A'}</div>
              <p className="text-sm text-gray-500 mt-1">
                <span className="text-purple-600 font-medium">
                  {formatNumber(summary?.correctiveDaysAllowed || 0, 1)}
                </span> corrective days/mo
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Trend */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Revenue Trend
                </CardTitle>
                <Badge variant="info">Last 12 months</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {data?.revenueHistory && data.revenueHistory.length > 0 ? (
                <RevenueChart data={data.revenueHistory} />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  Import data to see revenue trends
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contract Status */}
          <Card>
            <CardHeader>
              <CardTitle>Contract Status</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.contractStatus ? (
                <ContractStatusChart 
                  contracted={data.contractStatus.contracted}
                  nonContracted={data.contractStatus.nonContracted}
                />
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Contracted</span>
                  <span className="font-medium">{data?.contractStatus?.contracted || 0} sites</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Not Contracted</span>
                  <span className="font-medium">{data?.contractStatus?.nonContracted || 0} sites</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Capacity by SPV */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Capacity by SPV</CardTitle>
                <Link href="/spvs" className="text-sm text-blue-600 hover:underline">
                  View all →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {data?.capacityBySpv && data.capacityBySpv.length > 0 ? (
                <CapacityChart data={data.capacityBySpv} />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  Import data with SPV assignments to see breakdown
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Earning Sites */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  Top Earning Sites
                </CardTitle>
                <Link href="/sites" className="text-sm text-blue-600 hover:underline">
                  View all →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {data?.topSites && data.topSites.length > 0 ? (
                <div className="space-y-3">
                  {data.topSites.map((site, index) => (
                    <Link 
                      key={site.id}
                      href={`/sites/${site.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                          ${index === 0 ? 'bg-amber-100 text-amber-700' : 
                            index === 1 ? 'bg-gray-200 text-gray-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-600'}
                        `}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{site.name}</p>
                          <p className="text-xs text-gray-500">
                            {site.spv || 'No SPV'} • {formatNumber(site.capacity, 0)} kWp
                          </p>
                        </div>
                      </div>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(site.monthlyFee)}
                        <span className="text-xs text-gray-400 font-normal">/mo</span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  No contracted sites yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/sites"
                className="block p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <Building2 className="h-8 w-8 text-blue-500 mb-2" />
                <div className="font-medium">View All Sites</div>
                <p className="text-sm text-gray-500">
                  Browse and manage your portfolio sites
                </p>
              </Link>
              <Link
                href="/sites/new"
                className="block p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all"
              >
                <Zap className="h-8 w-8 text-green-500 mb-2" />
                <div className="font-medium">Add New Site</div>
                <p className="text-sm text-gray-500">
                  Create a new site entry manually
                </p>
              </Link>
              <Link
                href="/import"
                className="block p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all"
              >
                <PoundSterling className="h-8 w-8 text-purple-500 mb-2" />
                <div className="font-medium">Import from Excel</div>
                <p className="text-sm text-gray-500">
                  Bulk import sites from your spreadsheet
                </p>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
