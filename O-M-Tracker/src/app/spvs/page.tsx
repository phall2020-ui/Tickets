'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import { Building, Zap, PoundSterling, FileText, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface SpvSummary {
  code: string;
  name: string;
  siteCount: number;
  contractedCount: number;
  totalCapacityKwp: number;
  contractedCapacityKwp: number;
  monthlyRevenue: number;
}

export default function SpvsPage() {
  const [spvs, setSpvs] = useState<SpvSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSpvs();
  }, []);

  const fetchSpvs = async () => {
    try {
      const res = await fetch('/api/spvs/summary');
      const data = await res.json();
      
      if (data.success) {
        setSpvs(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch SPV data');
    } finally {
      setIsLoading(false);
    }
  };

  const totalRevenue = spvs.reduce((sum, s) => sum + s.monthlyRevenue, 0);
  const totalSites = spvs.reduce((sum, s) => sum + s.siteCount, 0);
  const totalCapacity = spvs.reduce((sum, s) => sum + s.totalCapacityKwp, 0);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header 
        title="SPV Portfolio" 
        subtitle="Special Purpose Vehicle breakdown and invoicing"
      />
      
      <div className="flex-1 p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total SPVs
              </CardTitle>
              <Building className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{spvs.length}</div>
              <p className="text-sm text-gray-500 mt-1">
                {totalSites} sites total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Capacity
              </CardTitle>
              <Zap className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatNumber(totalCapacity / 1000, 1)} MW
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Across all SPVs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Monthly Revenue
              </CardTitle>
              <PoundSterling className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatCurrency(totalRevenue)}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                From contracted sites
              </p>
            </CardContent>
          </Card>
        </div>

        {/* SPV Cards Grid */}
        {error ? (
          <div className="rounded-lg bg-red-50 p-4 text-red-700">
            {error}
          </div>
        ) : spvs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No SPV data</h3>
              <p className="text-gray-500 mt-1">
                Import sites with SPV assignments to see data here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {spvs.map((spv) => (
              <Card key={spv.code} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="info" className="text-sm">
                      {spv.code}
                    </Badge>
                    <Link href={`/spvs/${spv.code}`}>
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4 mr-1" />
                        Invoice
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                  <CardTitle className="text-lg mt-2">{spv.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Sites</p>
                      <p className="text-xl font-semibold">
                        {spv.siteCount}
                        <span className="text-sm font-normal text-gray-400 ml-1">
                          ({spv.contractedCount} contracted)
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Capacity</p>
                      <p className="text-xl font-semibold">
                        {formatNumber(spv.totalCapacityKwp / 1000, 2)} MW
                      </p>
                    </div>
                    <div className="col-span-2 pt-3 border-t">
                      <p className="text-sm text-gray-500">Monthly Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(spv.monthlyRevenue)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

