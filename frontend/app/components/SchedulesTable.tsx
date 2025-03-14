'use client';

import { useState, useEffect } from 'react';
import { Schedule } from '@/types/types';
import { useRouter } from 'next/navigation';

interface Provider {
    id: string;
    name: string;
}

export default function SchedulesTable() {
    const router = useRouter();
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [selectedProvider, setSelectedProvider] = useState<string>('');
    const [loadingProviders, setLoadingProviders] = useState(true);

    useEffect(() => {
        fetchSchedules();
        fetchProviders();
    }, []);

    const runSpeedTestNow = async () => {
        try {
            // Use the selected provider or default to librespeed if none selected
            const providerToUse = selectedProvider ? 
                providers.find(p => p.id === selectedProvider)?.name : 'librespeed';
            
            const response = await fetch('/api/speedtest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    providers: [providerToUse]
                }),
            });
            if (!response.ok) throw new Error('Failed to run speed test');
            setSuccess('Speed test started successfully');
            setTimeout(() => setSuccess(null), 5000);
        } catch (err) {
            setError(`Failed to run speed test: ${err}`);
        }
    };

    const fetchProviders = async () => {
        try {
            const response = await fetch('/api/providers');
            if (!response.ok) throw new Error('Failed to fetch providers');
            const data = await response.json();
            setProviders(data.data || []);
            // Set the first provider as default if available
            if (data.data && data.data.length > 0) {
                setSelectedProvider(data.data[0].id);
            }
        } catch (err) {
            console.error('Error loading providers:', err);
        } finally {
            setLoadingProviders(false);
        }
    };

    const fetchSchedules = async () => {
        try {
            const response = await fetch('/api/schedules');
            if (!response.ok) throw new Error('Failed to fetch schedules');
            const data = await response.json();
            setSchedules(data.data || []);
        } catch (err) {
            setError(`Failed to load schedules: ${err}`);
            console.error('Error loading schedules:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (schedule: Schedule) => {
        setUpdating(schedule.id);
        try {
            const response = await fetch('/api/schedules', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...schedule,
                    is_active: !schedule.is_active
                }),
            });

            if (!response.ok) throw new Error('Failed to update schedule');
            
            // Refresh schedules after update
            await fetchSchedules();
        } catch (err) {
            setError(`Failed to update schedule: ${err}`);
            console.error('Error updating schedule:', err);
        } finally {
            setUpdating(null);
        }
    };

    if (loading) {
        return <div className="text-center py-4">Loading schedules...</div>;
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4">
                {error}
            </div>
        );
    }

    return (
        <div className="p-6 bg-slate-800 rounded-lg shadow-lg max-w-4xl mx-auto mt-8">
            {success && (
                <div className="bg-green-500/10 border border-green-500 text-green-500 p-3 rounded mb-4">
                    {success}
                </div>
            )}
            
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold">Scheduled Tests</h2>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Speed Test Group */}
                    <div className="flex w-full sm:w-auto items-stretch bg-slate-700 rounded-lg overflow-hidden border border-slate-600 shadow-sm">
                        {loadingProviders ? (
                            <div className="text-sm text-slate-400 px-3 py-2">Loading providers...</div>
                        ) : (
                            <select
                                value={selectedProvider}
                                onChange={(e) => setSelectedProvider(e.target.value)}
                                className="py-2 pl-3 pr-8 bg-slate-700 border-r border-slate-600 focus:outline-none text-sm"
                                aria-label="Select provider"
                            >
                                {providers.map((provider) => (
                                    <option key={provider.id} value={provider.id}>
                                        {provider.name}
                                    </option>
                                ))}
                            </select>
                        )}
                        <button
                            onClick={runSpeedTestNow}
                            className="px-4 py-2 bg-primary text-white hover:bg-primary/80 flex-shrink-0 whitespace-nowrap"
                        >
                            Run Speed Test Now
                        </button>
                    </div>
                    
                    {/* Add Schedule Button */}
                    <button
                        onClick={() => router.push('/schedules/create')}
                        className="w-full sm:w-auto px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 shadow-sm"
                    >
                        Add Schedule
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                {schedules.length === 0 ? (
                    <div className="text-center py-12 bg-slate-800 rounded-lg">
                        <h3 className="text-xl font-semibold mb-2">No schedules found</h3>
                        <p className="text-slate-400 mb-4">Create a schedule to run speed tests automatically</p>
                        <button
                            onClick={() => router.push('/schedules/create')}
                            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/80"
                        >
                            Create Your First Schedule
                        </button>
                    </div>
                ) : (
                    <table className="min-w-full bg-slate-800 rounded-lg overflow-hidden">
                        <thead className="bg-slate-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Schedule</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Provider</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {schedules.map((schedule) => (
                                <tr key={schedule.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{schedule.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{schedule.cron_expression}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{schedule.provider_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => handleToggleActive(schedule)}
                                                disabled={updating === schedule.id}
                                                className={`px-2 py-1 text-xs rounded ${
                                                    schedule.is_active 
                                                    ? 'bg-green-500 hover:bg-green-600 text-white'
                                                    : 'bg-red-500 hover:bg-red-600 text-white' 
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                {updating === schedule.id ? 'Updating...' : schedule.is_active ? 'Active' : 'Inactive'}
                                            </button>
                                            <button
                                                onClick={() => router.push(`/schedules/edit?id=${schedule.id}`)}
                                                className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
} 