'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CronHelper from '@/app/components/CronHelper';
import cronstrue from 'cronstrue';
import { Schedule } from '@/types/types';

interface Provider {
    id: string;
    name: string;
}

export default function ScheduleForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const scheduleId = searchParams.get('id');
    const isEdit = Boolean(scheduleId);

    const [formData, setFormData] = useState<Schedule>({
        id: '',
        name: '',
        cron_expression: '',
        provider_id: '',
        provider_name: '',
        is_active: true,
        host_endpoint: '',
        host_port: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        result_limit: 0
    });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingSchedule, setLoadingSchedule] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loadingProviders, setLoadingProviders] = useState(true);
    const [showCronHelper, setShowCronHelper] = useState(false);
    const [cronPreview, setCronPreview] = useState<string | null>(null);

    const fetchSchedule = useCallback(async () => {
        if (!scheduleId) return;
        
        setLoadingSchedule(true);
        setError(null);
        
        try {
            const response = await fetch(`/api/schedules?id=${scheduleId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch schedule');
            }
            const result = await response.json();
            if (result.error) {
                throw new Error(result.error);
            }
            if (!result.data) {
                throw new Error('Schedule not found');
            }
            setFormData(result.data);
        } catch (err) {
            setError(`Failed to load schedule: ${err}`);
            console.error('Error loading schedule:', err);
            router.push('/');
        } finally {
            setLoadingSchedule(false);
        }
    }, [scheduleId, router]);

    useEffect(() => {
        fetchProviders();
        if (isEdit && scheduleId) {
            fetchSchedule();
        }
    }, [isEdit, scheduleId, fetchSchedule]);

    useEffect(() => {
        if (formData.cron_expression) {
            try {
                const explanation = cronstrue.toString(formData.cron_expression);
                setCronPreview(explanation);
            } catch (err) {
                console.log(`Cronstrue Error: ${err}`);
                setCronPreview(null);
            }
        } else {
            setCronPreview(null);
        }
    }, [formData.cron_expression]);

    const fetchProviders = async () => {
        try {
            const response = await fetch('/api/providers');
            if (!response.ok) throw new Error('Failed to fetch providers');
            const data = await response.json();
            setProviders(data.data || []);
        } catch (err) {
            console.error('Error loading providers:', err);
        } finally {
            setLoadingProviders(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            cronstrue.toString(formData.cron_expression);
        } catch (err) {
            console.log(`Cronstrue Error: ${err}`);
            setError('Invalid cron expression');
            setLoading(false);
            return;
        }

        if (formData.result_limit < 0) {
            setError('Result limit must be greater than 0');
            setLoading(false);
            return;
        }

        formData.result_limit = Number(formData.result_limit);

        try {
            const response = await fetch('/api/schedules', {
                method: isEdit ? 'PATCH' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error(isEdit ? 'Failed to update schedule' : 'Failed to create schedule');
            }

            router.push('/');
        } catch (err) {
            setError(`${isEdit ? 'Failed to update' : 'Failed to create'} schedule: ${err}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this schedule?')) {
            return;
        }

        setDeleting(true);
        try {
            const response = await fetch(`/api/schedules?id=${scheduleId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete schedule');
            }

            router.push('/');
        } catch (err) {
            setError(`Failed to delete schedule: ${err}`);
        } finally {
            setDeleting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (name === 'provider_id' && value) {
            const selectedProvider = providers.find(p => p.id === value);
            setFormData(prev => ({
                ...prev,
                provider_id: value,
                provider_name: selectedProvider?.name || '',
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
            }));
        }
    };

    const handleCronSelect = (expression: string) => {
        setFormData(prev => ({ ...prev, cron_expression: expression }));
        setShowCronHelper(false);
    };

    if (isEdit && loadingSchedule) {
        return (
            <div className="max-w-2xl mx-auto mt-8 p-6 glass-card">
                <div className="text-center py-4 text-foreground">Loading schedule...</div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto mt-8 p-6 glass-card">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-foreground">{isEdit ? 'Edit Schedule' : 'Create New Schedule'}</h1>
                <div className="flex space-x-2">
                    {isEdit && (
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {deleting ? 'Deleting...' : 'Delete'}
                        </button>
                    )}
                    <button
                        onClick={() => router.push('/')}
                        className="px-4 py-2 bg-secondary/20 text-foreground rounded hover:bg-secondary/30"
                    >
                        Cancel
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">
                        Schedule Name
                    </label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full p-2 bg-background/80 rounded border border-secondary/30 focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder-muted"
                        placeholder="Daily Speed Test"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">
                        Cron Expression
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            name="cron_expression"
                            value={formData.cron_expression}
                            onChange={handleChange}
                            required
                            className={`w-full p-2 bg-background/80 rounded border ${cronPreview ? 'border-green-500' : 'border-secondary/30'} focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder-muted`}
                            placeholder="0 0 * * *"
                        />
                        <button
                            type="button"
                            onClick={() => setShowCronHelper(!showCronHelper)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-primary hover:text-primary/80"
                        >
                            {showCronHelper ? 'Hide Helper' : 'Show Helper'}
                        </button>
                    </div>
                    {cronPreview && (
                        <div className="mt-2 text-sm">
                            <span className="text-green-500">✓</span>{' '}
                            <span className="text-secondary">{cronPreview}</span>
                        </div>
                    )}
                    {showCronHelper && (
                        <div className="mt-2 p-4 bg-background/60 rounded-lg">
                            <CronHelper onSelect={handleCronSelect} />
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">
                        Provider
                    </label>
                    {loadingProviders ? (
                        <div className="text-sm text-secondary">Loading providers...</div>
                    ) : (
                        <select
                            name="provider_id"
                            value={formData.provider_id}
                            onChange={handleChange}
                            required
                            className="w-full p-2 bg-background/80 rounded border border-secondary/30 focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
                        >
                            <option value="">Select a provider</option>
                            {providers.map((provider) => (
                                <option key={provider.id} value={provider.id}>
                                    {provider.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {formData.provider_name === 'iperf3' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-foreground">
                                Host Endpoint
                            </label>
                            <input
                                type="text"
                                name="host_endpoint"
                                value={formData.host_endpoint || ''}
                                onChange={handleChange}
                                required
                                className="w-full p-2 bg-background/80 rounded border border-secondary/30 focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder-muted"
                                placeholder="example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-foreground">
                                Host Port
                            </label>
                            <input
                                type="text"
                                name="host_port"
                                value={formData.host_port || ''}
                                onChange={handleChange}
                                required
                                className="w-full p-2 bg-background/80 rounded border border-secondary/30 focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder-muted"
                                placeholder="5201"
                            />
                        </div>
                        <div className="text-sm text-secondary mt-1">
                            If you do not have your own iperf3 server setup, you can find a public iperf3 server here: <a href="https://iperf.fr/iperf-servers.php" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://iperf.fr/iperf-servers.php</a>
                        </div>
                    </>
                )}

                <div className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleChange}
                        className="rounded border-secondary/30 text-primary focus:ring-primary"
                    />
                    <label className="text-sm font-medium text-foreground">
                        Active
                    </label>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">
                        Result Limit
                    </label>
                    <input
                        type="number"
                        name="result_limit"
                        value={formData.result_limit}
                        onChange={handleChange}
                        min="0"
                        className="w-full p-2 bg-background/80 rounded border border-secondary/30 focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder-muted"
                        placeholder="0"
                    />
                    <div className="mt-1 text-sm text-secondary">
                        Maximum number of results to keep. Set to 0 for no limit.
                    </div>
                </div>

                <div className="flex justify-end space-x-4">
                    <button
                        type="submit"
                        disabled={loading || !cronPreview}
                        className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Schedule' : 'Create Schedule')}
                    </button>
                </div>
            </form>
        </div>
    );
} 