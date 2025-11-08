import React from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import { useComments, useAddComment } from '../hooks/useTickets'

interface CommentsProps {
  ticketId: string
}

export default function Comments({ ticketId }: CommentsProps) {
  const { data: comments = [], isLoading, error } = useComments(ticketId)
  const addCommentMutation = useAddComment(ticketId)
  
  const [newComment, setNewComment] = React.useState('')
  const [visibility, setVisibility] = React.useState<'PUBLIC' | 'INTERNAL'>('INTERNAL')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      await addCommentMutation.mutateAsync({ body: newComment.trim(), visibility })
      setNewComment('')
      setVisibility('INTERNAL')
    } catch (error) {
      console.error('Failed to add comment:', error)
    }
  }

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Comments ({comments.length})
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error instanceof Error ? error.message : 'Failed to load comments'}
          </Alert>
        )}

        {addCommentMutation.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to add comment
          </Alert>
        )}

        {isLoading ? (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress />
          </Box>
        ) : comments.length === 0 ? (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No comments yet.
          </Typography>
        ) : (
          <Stack spacing={2} sx={{ mb: 3 }}>
            {comments.map(comment => (
              <Card
                key={comment.id}
                variant="outlined"
                sx={{
                  bgcolor: 'background.default',
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(comment.createdAt).toLocaleString()}
                      {comment.userId && ` · User ${comment.userId}`}
                    </Typography>
                    <Chip
                      label={comment.visibility}
                      size="small"
                      color={comment.visibility === 'PUBLIC' ? 'success' : 'default'}
                      sx={{ fontSize: '0.75rem' }}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {comment.body}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            disabled={addCommentMutation.isPending}
            sx={{ mb: 2 }}
            inputProps={{
              'aria-label': 'Comment text',
            }}
          />
          
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <FormLabel component="legend">Visibility</FormLabel>
            <RadioGroup
              row
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'INTERNAL')}
              aria-label="Comment visibility"
            >
              <FormControlLabel
                value="INTERNAL"
                control={<Radio />}
                label="Internal"
                disabled={addCommentMutation.isPending}
              />
              <FormControlLabel
                value="PUBLIC"
                control={<Radio />}
                label="Public"
                disabled={addCommentMutation.isPending}
              />
            </RadioGroup>
          </FormControl>
          
          <Button
            type="submit"
            variant="contained"
            disabled={!newComment.trim() || addCommentMutation.isPending}
            startIcon={addCommentMutation.isPending ? <CircularProgress size={20} /> : <SendIcon />}
            fullWidth
          >
            {addCommentMutation.isPending ? 'Adding Comment...' : 'Add Comment'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  )
}

