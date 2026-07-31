import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { INITIAL_SITES, INITIAL_VEHICLES, INITIAL_DEPOT_COORDS, DEMO_REPORTS } from './src/data/mockData';
import { DisasterSite, Vehicle, OptimizationResult, AgentPipelineRun, AgentStepLog, ChatMessage, ResourceType } from './src/types';
import { solveVRP, calculateHaversineDistanceKm } from './src/services/vrpSolver';

const PORT = 3000;

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function startServer() {
  const app = express();
  app.use(express.json());

  // In-memory Database State
  let sites: DisasterSite[] = JSON.parse(JSON.stringify(INITIAL_SITES));
  let vehicles: Vehicle[] = JSON.parse(JSON.stringify(INITIAL_VEHICLES));
  let currentOptimization: OptimizationResult | null = solveVRP(sites, vehicles, INITIAL_DEPOT_COORDS);
  let chatHistory: ChatMessage[] = [];

  // API Route: Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Route: Reset Data to Defaults
  app.post('/api/reset', (req, res) => {
    sites = JSON.parse(JSON.stringify(INITIAL_SITES));
    vehicles = JSON.parse(JSON.stringify(INITIAL_VEHICLES));
    currentOptimization = solveVRP(sites, vehicles, INITIAL_DEPOT_COORDS);
    chatHistory = [];
    res.json({ message: 'Database reset successfully', sites, vehicles, currentOptimization });
  });

  // API Route: Sites Management
  app.get('/api/sites', (req, res) => {
    res.json({ sites });
  });

  app.post('/api/sites', (req, res) => {
    const siteData: Partial<DisasterSite> = req.body;
    if (siteData.id) {
      sites = sites.map((s) => (s.id === siteData.id ? ({ ...s, ...siteData } as DisasterSite) : s));
    } else {
      const newSite: DisasterSite = {
        id: `site-${Date.now()}`,
        name: siteData.name || 'New Disaster Site',
        locationName: siteData.locationName || 'Unspecified Location',
        coords: siteData.coords || {
          lat: 37.77 + (Math.random() - 0.5) * 0.08,
          lng: -122.41 + (Math.random() - 0.5) * 0.08,
        },
        resourceNeeded: (siteData.resourceNeeded as ResourceType) || 'water',
        amountNeeded: siteData.amountNeeded || 50,
        peopleAffected: siteData.peopleAffected || 100,
        severity: siteData.severity || 3,
        reportedAt: siteData.reportedAt || new Date().toISOString(),
        urgencyWindowHours: siteData.urgencyWindowHours || 4,
        urgencyScore: siteData.urgencyScore || 60,
        status: siteData.status || 'pending',
        description: siteData.description || 'Disaster site report.',
      };
      sites.push(newSite);
    }
    // Re-run solver automatically
    currentOptimization = solveVRP(sites, vehicles, INITIAL_DEPOT_COORDS);
    res.json({ sites, currentOptimization });
  });

  app.delete('/api/sites/:id', (req, res) => {
    const { id } = req.params;
    sites = sites.filter((s) => s.id !== id);
    currentOptimization = solveVRP(sites, vehicles, INITIAL_DEPOT_COORDS);
    res.json({ sites, currentOptimization });
  });

  // API Route: Vehicles Management
  app.get('/api/vehicles', (req, res) => {
    res.json({ vehicles });
  });

  app.post('/api/vehicles', (req, res) => {
    const vData: Partial<Vehicle> = req.body;
    if (vData.id) {
      vehicles = vehicles.map((v) => (v.id === vData.id ? ({ ...v, ...vData } as Vehicle) : v));
    } else {
      const newVehicle: Vehicle = {
        id: `veh-${Date.now()}`,
        name: vData.name || 'New Transport Vehicle',
        type: vData.type || 'rapid_van',
        capacity: vData.capacity || 100,
        maxSpeedKmh: vData.maxSpeedKmh || 50,
        depotCoords: INITIAL_DEPOT_COORDS,
        depotName: 'Central Logistics Hub',
        status: vData.status || 'available',
        driverName: vData.driverName || 'Dispatch Officer',
      };
      vehicles.push(newVehicle);
    }
    currentOptimization = solveVRP(sites, vehicles, INITIAL_DEPOT_COORDS);
    res.json({ vehicles, currentOptimization });
  });

  // API Route: VRP Solver Trigger
  app.post('/api/optimize', (req, res) => {
    currentOptimization = solveVRP(sites, vehicles, INITIAL_DEPOT_COORDS);
    res.json({ optimization: currentOptimization });
  });

  // API Route: Fetch Demo Reports
  app.get('/api/demo-reports', (req, res) => {
    res.json({ demoReports: DEMO_REPORTS });
  });

  // AGENT STEP 1: Intake Agent (Parse Unstructured Text into Structured Site Data)
  app.post('/api/agent/intake', async (req, res) => {
    const { rawReport } = req.body;
    if (!rawReport) {
      return res.status(400).json({ error: 'rawReport is required' });
    }

    try {
      if (process.env.GEMINI_API_KEY) {
        const prompt = `You are ReliefRoute Intake Agent. Extract structured disaster site data from this raw report:
"${rawReport}"

Return a JSON object matching this schema:
- name: string (Short site or institution name)
- locationName: string (Address or location description)
- resourceNeeded: one of ["water", "medical", "food", "shelter", "generators", "rescue_gear"]
- amountNeeded: number (estimated quantity/units needed)
- peopleAffected: number
- severity: number (integer 1 to 5, where 5 is most life-threatening)
- description: string (clean summary)
- approximateLatOffset: number (between -0.04 and 0.04 for simulation coordinates around 37.77)
- approximateLngOffset: number (between -0.04 and 0.04 for simulation coordinates around -122.41)`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                locationName: { type: Type.STRING },
                resourceNeeded: { type: Type.STRING },
                amountNeeded: { type: Type.INTEGER },
                peopleAffected: { type: Type.INTEGER },
                severity: { type: Type.INTEGER },
                description: { type: Type.STRING },
                approximateLatOffset: { type: Type.NUMBER },
                approximateLngOffset: { type: Type.NUMBER },
              },
              required: ['name', 'locationName', 'resourceNeeded', 'amountNeeded', 'peopleAffected', 'severity', 'description'],
            },
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        const latOffset = parsed.approximateLatOffset || (Math.random() - 0.5) * 0.06;
        const lngOffset = parsed.approximateLngOffset || (Math.random() - 0.5) * 0.06;

        const siteData = {
          name: parsed.name || 'Extracted Emergency Site',
          locationName: parsed.locationName || 'Emergency Sector',
          coords: {
            lat: Number((INITIAL_DEPOT_COORDS.lat + latOffset).toFixed(4)),
            lng: Number((INITIAL_DEPOT_COORDS.lng + lngOffset).toFixed(4)),
          },
          resourceNeeded: validateResource(parsed.resourceNeeded),
          amountNeeded: Math.max(10, parsed.amountNeeded || 50),
          peopleAffected: Math.max(5, parsed.peopleAffected || 80),
          severity: Math.min(5, Math.max(1, parsed.severity || 3)) as 1 | 2 | 3 | 4 | 5,
          description: parsed.description || rawReport,
        };

        return res.json({ success: true, siteData, source: 'gemini_ai' });
      }
    } catch (err: any) {
      console.warn('Gemini Intake Agent fallback:', err?.message || err);
    }

    // Fallback rule-based parser if AI fails or key absent
    const fallbackSite = parseReportFallback(rawReport);
    res.json({ success: true, siteData: fallbackSite, source: 'rule_based_fallback' });
  });

  // AGENT STEP 2: Prioritization Agent (Calculates Urgency Scores and Time Windows)
  app.post('/api/agent/prioritize', async (req, res) => {
    const { siteData } = req.body;
    if (!siteData) {
      return res.status(400).json({ error: 'siteData is required' });
    }

    const severity = siteData.severity || 3;
    const casualties = siteData.peopleAffected || 50;
    const isMedicalOrGenerators = ['medical', 'generators', 'rescue_gear'].includes(siteData.resourceNeeded);

    let urgencyScore = severity * 15 + Math.min(20, Math.floor(casualties / 10));
    if (isMedicalOrGenerators) urgencyScore += 15;
    urgencyScore = Math.min(100, Math.max(10, urgencyScore));

    const urgencyWindowHours =
      urgencyScore >= 85 ? 2 : urgencyScore >= 70 ? 3 : urgencyScore >= 50 ? 5 : 8;

    const reasoning = `Prioritization Agent calculated Urgency Score ${urgencyScore}/100 based on Severity ${severity}/5, ${casualties} individuals impacted, and ${siteData.resourceNeeded.toUpperCase()} resource criticality. Allocated target delivery window: ${urgencyWindowHours} hours.`;

    res.json({
      urgencyScore,
      urgencyWindowHours,
      reasoning,
    });
  });

  // AGENT STEP 4: Dispatch Agent (Generates plain-language driver manifests)
  app.post('/api/agent/dispatch', async (req, res) => {
    const { routes } = req.body;
    if (!routes || !Array.isArray(routes)) {
      return res.status(400).json({ error: 'routes array is required' });
    }

    try {
      if (process.env.GEMINI_API_KEY && routes.length > 0) {
        const prompt = `You are ReliefRoute Dispatch Agent. Turn these vehicle routes into clear, professional dispatch operational summaries for relief drivers and field commanders:
${JSON.stringify(routes, null, 2)}

Provide concise bullet-point driver manifests for each vehicle with clear arrival expectations and safety priorities.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
        });

        return res.json({ dispatchSummary: response.text });
      }
    } catch (err: any) {
      console.warn('Dispatch agent fallback:', err?.message || err);
    }

    // Default plain language dispatch fallback
    const fallbackManifests = routes.map((r: any) =>
      `Vehicle ${r.vehicleName} (${r.driverName}): Dispatching to ${r.stops.length} stops. Total cargo volume: ${r.loadUsed}/${r.capacity} units (${r.loadPercentage}% capacity). Estimated completion time: ${r.totalTimeMinutes} minutes.`
    );

    res.json({ dispatchSummary: fallbackManifests.join('\n\n') });
  });

  // FULL MULTI-AGENT PIPELINE ROUTE
  app.post('/api/agent/pipeline', async (req, res) => {
    const { rawReport } = req.body;
    if (!rawReport) {
      return res.status(400).json({ error: 'rawReport is required' });
    }

    const runId = `run-${Date.now()}`;
    const stepLogs: AgentStepLog[] = [];

    // Step 1: Intake Agent
    const t1 = Date.now();
    let siteData: any = null;
    try {
      if (process.env.GEMINI_API_KEY) {
        const prompt = `Extract structured disaster site data from this raw report:
"${rawReport}"
Return JSON with: name, locationName, resourceNeeded (one of water/medical/food/shelter/generators/rescue_gear), amountNeeded (number), peopleAffected (number), severity (1-5), description.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                locationName: { type: Type.STRING },
                resourceNeeded: { type: Type.STRING },
                amountNeeded: { type: Type.INTEGER },
                peopleAffected: { type: Type.INTEGER },
                severity: { type: Type.INTEGER },
                description: { type: Type.STRING },
              },
              required: ['name', 'locationName', 'resourceNeeded', 'amountNeeded', 'peopleAffected', 'severity', 'description'],
            },
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        siteData = {
          name: parsed.name || 'Extracted Disaster Location',
          locationName: parsed.locationName || 'Affected Zone',
          coords: {
            lat: Number((INITIAL_DEPOT_COORDS.lat + (Math.random() - 0.5) * 0.07).toFixed(4)),
            lng: Number((INITIAL_DEPOT_COORDS.lng + (Math.random() - 0.5) * 0.07).toFixed(4)),
          },
          resourceNeeded: validateResource(parsed.resourceNeeded),
          amountNeeded: Math.max(10, parsed.amountNeeded || 40),
          peopleAffected: Math.max(5, parsed.peopleAffected || 60),
          severity: Math.min(5, Math.max(1, parsed.severity || 3)) as 1 | 2 | 3 | 4 | 5,
          description: parsed.description || rawReport,
        };
      } else {
        siteData = parseReportFallback(rawReport);
      }

      stepLogs.push({
        id: `step-1-${runId}`,
        agentName: 'Intake Agent',
        status: 'success',
        timestamp: new Date().toISOString(),
        summary: `Parsed raw report into structured disaster site: ${siteData.name} (${siteData.resourceNeeded.toUpperCase()}, ${siteData.amountNeeded} units requested)`,
        details: siteData,
        durationMs: Date.now() - t1,
      });
    } catch (err: any) {
      siteData = parseReportFallback(rawReport);
      stepLogs.push({
        id: `step-1-${runId}`,
        agentName: 'Intake Agent',
        status: 'success',
        timestamp: new Date().toISOString(),
        summary: `Structured raw report using rule engine fallback: ${siteData.name}`,
        details: siteData,
        durationMs: Date.now() - t1,
      });
    }

    // Step 2: Prioritization Agent
    const t2 = Date.now();
    const severity = siteData.severity;
    const casualties = siteData.peopleAffected;
    const isCriticalResource = ['medical', 'generators', 'rescue_gear'].includes(siteData.resourceNeeded);

    let urgencyScore = severity * 15 + Math.min(20, Math.floor(casualties / 10));
    if (isCriticalResource) urgencyScore += 15;
    urgencyScore = Math.min(100, Math.max(15, urgencyScore));

    const windowHours = urgencyScore >= 85 ? 2 : urgencyScore >= 70 ? 3 : urgencyScore >= 50 ? 5 : 8;

    const newSite: DisasterSite = {
      id: `site-${Date.now()}`,
      name: siteData.name,
      locationName: siteData.locationName,
      coords: siteData.coords,
      resourceNeeded: siteData.resourceNeeded,
      amountNeeded: siteData.amountNeeded,
      peopleAffected: siteData.peopleAffected,
      severity: siteData.severity,
      reportedAt: new Date().toISOString(),
      urgencyWindowHours: windowHours,
      urgencyScore: urgencyScore,
      status: 'pending',
      description: siteData.description,
    };

    // Save site to database
    sites.push(newSite);

    stepLogs.push({
      id: `step-2-${runId}`,
      agentName: 'Prioritization Agent',
      status: 'success',
      timestamp: new Date().toISOString(),
      summary: `Assigned Urgency Score ${urgencyScore}/100 and ${windowHours}-hour fulfillment target window.`,
      details: { urgencyScore, windowHours, severity, peopleAffected: casualties },
      durationMs: Date.now() - t2,
    });

    // Step 3: Routing Optimization Agent (OR Solver)
    const t3 = Date.now();
    currentOptimization = solveVRP(sites, vehicles, INITIAL_DEPOT_COORDS);

    stepLogs.push({
      id: `step-3-${runId}`,
      agentName: 'Routing Solver',
      status: 'success',
      timestamp: new Date().toISOString(),
      summary: `Solved CVRPTW across ${sites.length} sites and ${vehicles.length} vehicles in ${currentOptimization.metrics.solverExecutionTimeMs}ms. (${currentOptimization.metrics.distanceSavedPercent}% distance saved vs naive route).`,
      details: currentOptimization.metrics,
      durationMs: Date.now() - t3,
    });

    // Step 4: Dispatch Agent
    const t4 = Date.now();
    let dispatchManifests: Record<string, string[]> = {};

    currentOptimization.routes.forEach((route) => {
      dispatchManifests[route.vehicleId] = route.driverInstructions;
    });

    stepLogs.push({
      id: `step-4-${runId}`,
      agentName: 'Dispatch Agent',
      status: 'success',
      timestamp: new Date().toISOString(),
      summary: `Generated turn-by-turn operational driver manifests for ${currentOptimization.routes.length} dispatched vehicles.`,
      details: { routesCount: currentOptimization.routes.length },
      durationMs: Date.now() - t4,
    });

    const pipelineRun: AgentPipelineRun = {
      runId,
      rawReport,
      createdSite: newSite,
      urgencyAnalysis: {
        urgencyScore,
        windowHours,
        reasoning: `Assigned priority ${urgencyScore}/100.`,
      },
      optimizationResult: currentOptimization,
      dispatchManifests,
      stepLogs,
      status: 'completed',
    };

    res.json({ pipelineRun, sites, currentOptimization });
  });

  // DISPATCH AGENT CHAT API (Interactive Q&A)
  app.post('/api/agent/chat', async (req, res) => {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: question,
      timestamp: new Date().toISOString(),
    };
    chatHistory.push(userMsg);

    let answerText = '';

    try {
      if (process.env.GEMINI_API_KEY) {
        const routeContext = currentOptimization
          ? JSON.stringify({
              metrics: currentOptimization.metrics,
              routes: currentOptimization.routes.map((r) => ({
                vehicle: r.vehicleName,
                driver: r.driverName,
                loadUsed: `${r.loadUsed}/${r.capacity}`,
                stops: r.stops.map((s) => `${s.stopOrder}. ${s.siteName} (${s.amountDelivered} ${s.resourceDelivered})`),
              })),
              unassignedSitesCount: currentOptimization.unassignedSiteIds.length,
            })
          : 'No routes generated yet.';

        const prompt = `You are the ReliefRoute Operations & Dispatch Officer Agent.
Answer the user's question about the disaster relief routing plan based strictly on current system context.

CURRENT ROUTING CONTEXT:
${routeContext}

DISASTER SITES LIST:
${JSON.stringify(sites.map((s) => ({ name: s.name, resource: s.resourceNeeded, severity: s.severity, urgency: s.urgencyScore, status: s.status })))}

USER QUESTION: "${question}"

Provide a clear, professional, direct response explaining the solver's routing decisions, vehicle load capacities, or priority reasoning.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
        });

        answerText = response.text || 'Dispatch Agent analysis complete.';
      }
    } catch (err: any) {
      console.warn('Dispatch Chat fallback:', err?.message || err);
    }

    if (!answerText) {
      answerText = generateFallbackChatAnswer(question, currentOptimization, sites);
    }

    const agentMsg: ChatMessage = {
      id: `msg-${Date.now()}-agent`,
      sender: 'dispatch_agent',
      text: answerText,
      timestamp: new Date().toISOString(),
    };
    chatHistory.push(agentMsg);

    res.json({ message: agentMsg, chatHistory });
  });

  // Vite Integration in Development / Static Serving in Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ReliefRoute server running on http://0.0.0.0:${PORT}`);
  });
}

// Helper: Resource validator
function validateResource(res: string | undefined): ResourceType {
  const valid: ResourceType[] = ['water', 'medical', 'food', 'shelter', 'generators', 'rescue_gear'];
  if (res && valid.includes(res.toLowerCase() as ResourceType)) {
    return res.toLowerCase() as ResourceType;
  }
  return 'water';
}

// Helper: Rule-based fallback parser for disaster reports
function parseReportFallback(rawReport: string): Partial<DisasterSite> {
  const text = rawReport.toLowerCase();
  let resourceNeeded: ResourceType = 'water';
  if (text.includes('medical') || text.includes('clinic') || text.includes('trauma') || text.includes('hospital')) {
    resourceNeeded = 'medical';
  } else if (text.includes('generator') || text.includes('power') || text.includes('blackout')) {
    resourceNeeded = 'generators';
  } else if (text.includes('food') || text.includes('meal') || text.includes('groceries')) {
    resourceNeeded = 'food';
  } else if (text.includes('shelter') || text.includes('blanket') || text.includes('cot') || text.includes('tarp')) {
    resourceNeeded = 'shelter';
  } else if (text.includes('rescue') || text.includes('landslide') || text.includes('trapped') || text.includes('gear')) {
    resourceNeeded = 'rescue_gear';
  }

  let severity: 1 | 2 | 3 | 4 | 5 = 3;
  if (text.includes('urgent') || text.includes('critical') || text.includes('emergency') || text.includes('life-threatening')) {
    severity = 5;
  } else if (text.includes('severe') || text.includes('flood') || text.includes('blackout')) {
    severity = 4;
  }

  return {
    name: rawReport.split('.')[0].slice(0, 40) || 'Reported Incident Zone',
    locationName: 'Disaster Affected Sector',
    coords: {
      lat: Number((INITIAL_DEPOT_COORDS.lat + (Math.random() - 0.5) * 0.06).toFixed(4)),
      lng: Number((INITIAL_DEPOT_COORDS.lng + (Math.random() - 0.5) * 0.06).toFixed(4)),
    },
    resourceNeeded,
    amountNeeded: severity * 20,
    peopleAffected: severity * 40,
    severity,
    description: rawReport,
  };
}

// Helper: Rule-based fallback chat response generator
function generateFallbackChatAnswer(q: string, opt: OptimizationResult | null, sites: DisasterSite[]): string {
  const query = q.toLowerCase();
  if (query.includes('why') || query.includes('order') || query.includes('first')) {
    return `The OR Routing Solver prioritizes high urgency scores and strict time window constraints. Sites with Severity 5 or urgent medical/generator needs are ordered first to minimize overall system penalty and ensure critical lives are safeguarded before secondary resource stops.`;
  }
  if (query.includes('capacity') || query.includes('load') || query.includes('full')) {
    if (!opt) return 'No optimization routes generated currently.';
    const loads = opt.routes.map((r) => `${r.vehicleName}: ${r.loadUsed}/${r.capacity} units (${r.loadPercentage}%)`).join(', ');
    return `Current vehicle capacities are: ${loads}. Total active sites serviced: ${opt.metrics.sitesFulfilledCount}/${opt.metrics.totalSitesCount}.`;
  }
  if (query.includes('efficiency') || query.includes('saved') || query.includes('faster')) {
    if (!opt) return 'Run optimization to calculate efficiency gains.';
    return `The OR-Tools VRP solver achieved a ${opt.metrics.distanceSavedPercent}% reduction in total travel distance (${opt.metrics.totalDistanceKm} km vs ${opt.metrics.naiveDistanceKm} km naive) and saved ${opt.metrics.timeSavedPercent}% in total transit time across all field vehicles.`;
  }
  return `ReliefRoute is currently managing ${sites.length} disaster incident sites. Active routes are optimized to balance vehicle capacity limits, vehicle max speeds, and site urgency windows. Let me know if you need specific driver details or site priority explanations.`;
}

startServer();
