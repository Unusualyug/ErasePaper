export function publicUser(user, admin = false) {
  if (!user) return null;
  const data = {
    id: String(user._id),
    studentId: user.studentId,
    username: user.username,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    email: user.email || '',
    role: user.role,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt || null,
  };
  return data;
}
export function publicRequest(request, admin = false) {
  const user = request.userId && typeof request.userId === 'object' ? request.userId : null;
  const data = {
    id: String(request._id),
    requestId: request.requestId,
    userId: user ? String(user._id) : String(request.userId),
    serviceSlug: request.serviceSlug,
    serviceType: request.serviceType,
    title: request.title,
    description: request.description,
    additionalInfo: request.additionalInfo || '',
    details: request.details || {},
    status: request.status,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    attachments: (request.attachments || []).map((a) => ({
      id: a.id,
      name: a.name,
      size: a.size,
      mimeType: a.mimeType,
    })),
    student: user ? publicUser(user, admin) : null,
  };
  if (admin) data.adminNotes = request.adminNotes || '';
  return data;
}
