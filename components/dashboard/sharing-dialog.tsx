'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  shareDashboardWithUser,
  createShareToken,
  getDashboardShares,
  removeShare,
  revokeShareToken,
  SHARE_PERMISSIONS,
  SHARE_EXPIRATION_OPTIONS,
  generateShareUrl,
  type DashboardShare,
  type ShareToken,
} from '@/lib/sharing-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { Copy, Trash2, X, Check, Link as LinkIcon } from 'lucide-react'

interface SharingDialogProps {
  dashboardId: number
  dashboardName: string
  isOpen: boolean
  onClose: () => void
}

export function SharingDialog({ dashboardId, dashboardName, isOpen, onClose }: SharingDialogProps) {
  const { accessToken } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [shares, setShares] = useState<DashboardShare[]>([])
  const [shareTokens, setShareTokens] = useState<ShareToken[]>([])
  const [tab, setTab] = useState<'links' | 'people'>('links')

  // Form state
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<'view' | 'edit'>('view')
  const [expiration, setExpiration] = useState<number | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && accessToken) {
      loadShares()
    }
  }, [isOpen, accessToken])

  const loadShares = async () => {
    if (!accessToken) return
    setIsLoading(true)
    try {
      const [sharesRes, tokensRes] = await Promise.all([
        getDashboardShares(dashboardId, accessToken),
        Promise.resolve([] as ShareToken[]), // TODO: Implement token fetching
      ])
      setShares(sharesRes)
      setShareTokens(tokensRes)
    } catch (error) {
      toast.error('Failed to load shares')
    } finally {
      setIsLoading(false)
    }
  }

  const handleShareWithUser = async () => {
    if (!email || !accessToken) {
      toast.error('Please enter an email address')
      return
    }

    setIsSharing(true)
    try {
      await shareDashboardWithUser(dashboardId, email, permission, accessToken)
      toast.success(`Dashboard shared with ${email}`)
      setEmail('')
      await loadShares()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to share dashboard')
    } finally {
      setIsSharing(false)
    }
  }

  const handleCreateLink = async () => {
    if (!accessToken) return

    setIsSharing(true)
    try {
      const token = await createShareToken(
        dashboardId,
        permission,
        expiration || undefined,
        undefined,
        accessToken
      )
      toast.success('Share link created')
      await loadShares()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create link')
    } finally {
      setIsSharing(false)
    }
  }

  const handleCopyLink = (token: string) => {
    const url = generateShareUrl(token)
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
    toast.success('Link copied to clipboard')
  }

  const handleRemoveShare = async (shareId: number) => {
    if (!accessToken) return

    try {
      await removeShare(shareId, accessToken)
      setShares((prev) => prev.filter((s) => s.id !== shareId))
      toast.success('Share removed')
    } catch (error) {
      toast.error('Failed to remove share')
    }
  }

  const handleRevokeToken = async (tokenId: number) => {
    if (!accessToken) return

    try {
      await revokeShareToken(tokenId, accessToken)
      setShareTokens((prev) => prev.filter((t) => t.id !== tokenId))
      toast.success('Link revoked')
    } catch (error) {
      toast.error('Failed to revoke link')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-card border-border max-h-96 overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-border sticky top-0 bg-card">
          <div>
            <CardTitle>Share Dashboard</CardTitle>
            <CardDescription>{dashboardName}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-full hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => setTab('links')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                tab === 'links'
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              <LinkIcon className="w-4 h-4 mr-2 inline" />
              Share Links
            </button>
            <button
              onClick={() => setTab('people')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                tab === 'people'
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              People
            </button>
          </div>

          {/* Share Links Tab */}
          {tab === 'links' && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Permission
                  </label>
                  <Select value={permission} onValueChange={(v) => setPermission(v as any)}>
                    <SelectTrigger className="bg-background border-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {Object.entries(SHARE_PERMISSIONS).map(([key, perm]) => (
                        <SelectItem key={key} value={key}>
                          {perm.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">
                    Expiration
                  </label>
                  <Select
                    value={expiration?.toString() || ''}
                    onValueChange={(v) => setExpiration(v ? parseInt(v) : null)}
                  >
                    <SelectTrigger className="bg-background border-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {SHARE_EXPIRATION_OPTIONS.map((opt) => (
                        <SelectItem
                          key={opt.label}
                          value={opt.value?.toString() || ''}
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleCreateLink}
                  disabled={isSharing}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSharing ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Share Link'
                  )}
                </Button>
              </div>

              {/* Existing Links */}
              {shareTokens.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-foreground">Active Links</h4>
                  {shareTokens.map((token) => (
                    <div
                      key={token.token}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded border border-border"
                    >
                      <div className="text-sm text-muted-foreground truncate">
                        {generateShareUrl(token.token).slice(0, 40)}...
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyLink(token.token)}
                          className="h-8 px-2"
                        >
                          {copiedToken === token.token ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeToken(token.id)}
                          className="h-8 px-2 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* People Tab */}
          {tab === 'people' && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="email">Email Address</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="bg-background border-input"
                    />
                  </Field>
                </FieldGroup>

                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="permission">Permission</FieldLabel>
                    <Select value={permission} onValueChange={(v) => setPermission(v as any)}>
                      <SelectTrigger className="bg-background border-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {Object.entries(SHARE_PERMISSIONS).map(([key, perm]) => (
                          <SelectItem key={key} value={key}>
                            {perm.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>

                <Button
                  onClick={handleShareWithUser}
                  disabled={isSharing || !email}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSharing ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" />
                      Sharing...
                    </>
                  ) : (
                    'Share with User'
                  )}
                </Button>
              </div>

              {/* Shared Users */}
              {shares.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-foreground">Shared With</h4>
                  {shares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded border border-border"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {share.shared_with_email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {SHARE_PERMISSIONS[share.permission].label}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveShare(share.id)}
                        className="h-8 px-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {shares.length === 0 && (
                <div className="p-4 bg-muted/30 rounded text-center text-sm text-muted-foreground">
                  Not shared with anyone yet
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
