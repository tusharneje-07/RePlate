import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
	FoodInspectorProfile,
	InspectorListing,
	InspectorComplaint,
	FieldInspectionRecord,
	InspectorSafetyAlert,
	EnforcementActionLog,
	AIRiskDetection,
	WeatherRiskAlert,
	InspectorComplianceStats,
	InspectorNotification,
	InspectionListingStatus,
	EnforcementActionType,
} from '@/types'
import {
	mockInspectorProfile,
	mockInspectorListings,
	mockInspectorComplaints,
	mockFieldInspectionRecords,
	mockInspectorSafetyAlerts,
	mockEnforcementActionLogs,
	mockAIRiskDetections,
	mockWeatherRiskAlerts,
	mockInspectorComplianceStats,
	mockInspectorNotifications,
} from '@/data/inspector-mock'

interface InspectorState {
	profile: FoodInspectorProfile
	listings: InspectorListing[]
	complaints: InspectorComplaint[]
	fieldInspections: FieldInspectionRecord[]
	alerts: InspectorSafetyAlert[]
	enforcementLogs: EnforcementActionLog[]
	aiRiskDetections: AIRiskDetection[]
	weatherAlerts: WeatherRiskAlert[]
	stats: InspectorComplianceStats
	notifications: InspectorNotification[]
	unreadCount: number

	updateProfile: (updates: Partial<FoodInspectorProfile>) => void
	updateListingStatus: (listingId: string, status: InspectionListingStatus, note?: string) => void
	requestListingInfo: (listingId: string, note: string) => void
	resolveComplaint: (complaintId: string, summary: string, action?: EnforcementActionType) => void
	startInvestigation: (complaintId: string, note: string) => void
	logEnforcementAction: (entry: Omit<EnforcementActionLog, 'id' | 'createdAt'>) => void
	addFieldInspection: (record: Omit<FieldInspectionRecord, 'id' | 'createdAt'>) => void
	markAlertResolved: (alertId: string) => void
	markNotificationRead: (notificationId: string) => void
	markAllNotificationsRead: () => void
}

function recalcUnread(notifications: InspectorNotification[]) {
	return notifications.filter((item) => !item.isRead).length
}

export const useInspectorStore = create<InspectorState>()(
	persist(
		(set) => ({
			profile: mockInspectorProfile,
			listings: mockInspectorListings,
			complaints: mockInspectorComplaints,
			fieldInspections: mockFieldInspectionRecords,
			alerts: mockInspectorSafetyAlerts,
			enforcementLogs: mockEnforcementActionLogs,
			aiRiskDetections: mockAIRiskDetections,
			weatherAlerts: mockWeatherRiskAlerts,
			stats: mockInspectorComplianceStats,
			notifications: mockInspectorNotifications,
			unreadCount: recalcUnread(mockInspectorNotifications),

			updateProfile: (updates) =>
				set((state) => ({ profile: { ...state.profile, ...updates } })),

			updateListingStatus: (listingId, status, note) =>
				set((state) => ({
					listings: state.listings.map((item) =>
						item.id === listingId
							? {
								...item,
								status,
								inspectionNotes: note ?? item.inspectionNotes,
								lastActionAt: new Date().toISOString(),
								lastActionBy: state.profile.name,
								updatedAt: new Date().toISOString(),
							}
							: item,
					),
				})),

			requestListingInfo: (listingId, note) =>
				set((state) => ({
					listings: state.listings.map((item) =>
						item.id === listingId
							? {
								...item,
								status: 'info_requested',
								inspectionNotes: note,
								lastActionAt: new Date().toISOString(),
								lastActionBy: state.profile.name,
								updatedAt: new Date().toISOString(),
							}
							: item,
					),
				})),

			resolveComplaint: (complaintId, summary, action) =>
				set((state) => {
					const now = new Date().toISOString()
					const complaints: InspectorComplaint[] = state.complaints.map((item) =>
						item.id === complaintId
							? {
								...item,
								status: 'resolved' as const,
								resolutionSummary: summary,
								actionTaken: action,
								resolvedAt: now,
								updatedAt: now,
							}
							: item,
					)

					const resolvedCount = complaints.filter((item) => item.status === 'resolved').length

					return {
						complaints,
						stats: {
							...state.stats,
							resolvedComplaints: resolvedCount,
							activeInvestigations: Math.max(0, state.stats.activeInvestigations - 1),
						},
					}
				}),

			startInvestigation: (complaintId, note) =>
				set((state) => ({
					complaints: state.complaints.map((item) =>
						item.id === complaintId
							? {
								...item,
								status: 'investigating' as const,
								investigationNotes: note,
								updatedAt: new Date().toISOString(),
							}
							: item,
					),
					stats: {
						...state.stats,
						activeInvestigations: state.stats.activeInvestigations + 1,
					},
				})),

			logEnforcementAction: (entry) =>
				set((state) => ({
					enforcementLogs: [
						{
							...entry,
							id: `enf-${Date.now()}`,
							createdAt: new Date().toISOString(),
						},
						...state.enforcementLogs,
					],
				})),

			addFieldInspection: (record) =>
				set((state) => ({
					fieldInspections: [
						{
							...record,
							id: `field-${Date.now()}`,
							createdAt: new Date().toISOString(),
						},
						...state.fieldInspections,
					],
				})),

			markAlertResolved: (alertId) =>
				set((state) => ({
					alerts: state.alerts.map((item) =>
						item.id === alertId ? { ...item, isResolved: true } : item,
					),
				})),

			markNotificationRead: (notificationId) =>
				set((state) => {
					const notifications = state.notifications.map((item) =>
						item.id === notificationId ? { ...item, isRead: true } : item,
					)
					return {
						notifications,
						unreadCount: recalcUnread(notifications),
					}
				}),

			markAllNotificationsRead: () =>
				set((state) => ({
					notifications: state.notifications.map((item) => ({ ...item, isRead: true })),
					unreadCount: 0,
				})),
		}),
		{
			name: 'inspector-store',
			partialize: (state) => ({
				profile: state.profile,
				fieldInspections: state.fieldInspections,
				enforcementLogs: state.enforcementLogs,
			}),
		},
	),
)
