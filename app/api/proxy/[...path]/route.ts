// app/api/proxy/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { dbGetSession } from '@/lib/dbController';
import axios from 'axios';
import {
  dbGetSubjects,
  dbGetTopics,
  dbGetSubTopics,
  dbGetTests,
  dbGetTestById,
  dbCreateTest,
  dbUpdateTest,
  dbDeleteTest,
  dbCreateQuestionsBulk,
  dbGetQuestionsByIds
} from '@/lib/dbController';

async function handleLocalFallback(method: string, path: string[], body: any) {
  console.log(`[Proxy Fallback] Handling local CRUD for: ${method} /${path.join('/')}`);

  try {
    // 1. Subjects
    if (path[0] === 'subjects' && method === 'GET') {
      const data = await dbGetSubjects();
      return NextResponse.json({ success: true, data });
    }

    // 2. Topics
    if (path[0] === 'topics' && path[1] === 'subject' && method === 'GET') {
      const subjectId = path[2];
      const data = await dbGetTopics(subjectId);
      return NextResponse.json({ success: true, data });
    }

    // 3. Sub-topics
    if (path[0] === 'sub-topics' && path[1] === 'multi-topics' && method === 'POST') {
      const topicIds = body?.topic_ids || body?.topics || [];
      const data = await dbGetSubTopics(topicIds);
      return NextResponse.json({ success: true, data });
    }

    // 4. Tests CRUD
    if (path[0] === 'tests') {
      // tests list / create
      if (path.length === 1) {
        if (method === 'GET') {
          const data = await dbGetTests();
          return NextResponse.json({ success: true, data });
        }
        if (method === 'POST') {
          const data = await dbCreateTest(body);
          return NextResponse.json({ success: true, data });
        }
      }
      // single test GET / PUT / DELETE
      if (path.length === 2) {
        const testId = path[1];
        if (method === 'GET') {
          const data = await dbGetTestById(testId);
          if (!data) return NextResponse.json({ success: false, message: 'Test not found' }, { status: 404 });
          return NextResponse.json({ success: true, data });
        }
        if (method === 'PUT') {
          const data = await dbUpdateTest(testId, body);
          if (!data) return NextResponse.json({ success: false, message: 'Test not found' }, { status: 404 });
          return NextResponse.json({ success: true, data });
        }
        if (method === 'DELETE') {
          const deleted = await dbDeleteTest(testId);
          if (!deleted) return NextResponse.json({ success: false, message: 'Test not found' }, { status: 404 });
          return NextResponse.json({ success: true, message: 'Test deleted' });
        }
      }
    }

    // 5. Questions bulk create
    if (path[0] === 'questions' && path[1] === 'bulk' && method === 'POST') {
      const questions = body?.questions || [];
      const createdIds = await dbCreateQuestionsBulk(questions);
      return NextResponse.json({ success: true, data: createdIds });
    }

    // 6. Questions bulk fetch
    if (path[0] === 'questions' && path[1] === 'fetchBulk' && method === 'POST') {
      const questionIds = body?.question_ids || body?.questionIds || [];
      const data = await dbGetQuestionsByIds(questionIds);
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, message: `Mock API path /${path.join('/')} not handled` }, { status: 404 });
  } catch (err: any) {
    console.error('Local fallback handler error:', err);
    return NextResponse.json({ success: false, message: err.message || 'Local fallback error' }, { status: 500 });
  }
}

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  // 1. Verify our JWT cookie
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const payload = verifyToken(token);
  if (!payload) {
    const response = NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
    response.cookies.delete('token');
    return response;
  }

  // 2. Retrieve external token from MongoDB
  const session = await dbGetSession(payload.userId);
  if (!session) {
    const response = NextResponse.json({ success: false, message: 'Session expired' }, { status: 401 });
    response.cookies.delete('token');
    return response;
  }

  const resolvedParams = await params;
  const path = resolvedParams.path;
  const searchParams = req.nextUrl.searchParams.toString();
  
  let body: any = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.json().catch(() => undefined);
  }

  // 3. Check if external token is mock (offline mode)
  if (session.externalToken.startsWith('mock-')) {
    return handleLocalFallback(req.method, path, body);
  }

  // 4. Try to forward request to external API
  const externalUrl = `${process.env.EXTERNAL_API_BASE || 'https://admin-moderator-backend-staging.up.railway.app/api'}/${path.join('/')}`;
  const fullUrl = searchParams ? `${externalUrl}?${searchParams}` : externalUrl;

  try {
    const { data, status } = await axios({
      method: req.method,
      url: fullUrl,
      data: body,
      headers: { Authorization: `Bearer ${session.externalToken}` },
      timeout: 5000,
    });
    return NextResponse.json(data, { status });
  } catch (err: any) {
    console.warn(`External API error on ${req.method} /${path.join('/')}. Falling back to local data store.`);
    return handleLocalFallback(req.method, path, body);
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as PATCH };
